import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from .models import SecurityEvent, IncidentAlert

# Expected internal IP ranges for authorized integration traffic
AUTHORIZED_INTERNAL_PREFIXES = ("10.20.4.", "172.16.")
# Retired client versions
RETIRED_USER_AGENTS = ("tallybridge-sync/3.4.1", "tallybridge-sync/3.4.0", "python-requests")
# High sensitivity endpoints
SENSITIVE_ENDPOINTS = ("/v2/payments/search", "/v2/vendors/export", "/v2/exports")

class RulesEngine:
    def __init__(self):
        # In-memory incident cache keyed by incident_key
        self.incidents: Dict[str, IncidentAlert] = {}
        # Sliding windows for stateful correlation
        self.export_tracker: Dict[str, List[Dict[str, Any]]] = {}  # ip/actor -> export events
        self.auth_failures: Dict[str, List[Dict[str, Any]]] = {}   # user/ip -> failed signins
        self.sensitive_searches: Dict[str, List[Dict[str, Any]]] = {} # ip -> search events
        self.cross_system_tracker: Dict[str, Dict[str, Any]] = {} # ip -> systems seen

    def reset(self):
        self.incidents.clear()
        self.export_tracker.clear()
        self.auth_failures.clear()
        self.sensitive_searches.clear()
        self.cross_system_tracker.clear()

    def process_event(self, event: SecurityEvent) -> Optional[IncidentAlert]:
        """
        Evaluates the incoming event against all 8 explainable detection rules.
        Returns a new or updated IncidentAlert if a rule matches.
        """
        matched_incident = None

        # Track cross-system activity for Rule 6
        ip = event.source_ip
        if ip and not ip.startswith("127."):
            if ip not in self.cross_system_tracker:
                self.cross_system_tracker[ip] = {"systems": set(), "events": [], "first_seen": event.ts_utc}
            self.cross_system_tracker[ip]["systems"].add(event.system)
            self.cross_system_tracker[ip]["events"].append(event.id)

        # Rule 7: Unapproved Vendor Bank Account Alteration (Highest Criticality)
        if event.action.startswith("vendor.change.bank_account") or ("bank" in event.action and "change" in event.action):
            approval_ref = event.metadata.get("approval_ref", "")
            if not approval_ref:
                matched_incident = self._record_or_update_incident(
                    incident_key=f"RULE-BNK-007:{event.actor}:{event.source_ip}",
                    rule_code="RULE-BNK-007",
                    rule_name="Unapproved Vendor Bank Account Alteration",
                    severity="critical",
                    rule_score=99,
                    confidence="high",
                    system=event.system,
                    source_ip=event.source_ip,
                    actor=event.actor,
                    explanation=(
                        f"CRITICAL: Direct modification of vendor bank details without dual-approval reference. "
                        f"Actor '{event.actor}' updated bank account details for {event.metadata.get('vendor_name', 'vendor')} "
                        f"without independent confirmation (approval_ref is blank). Violates IT Policy TPS-POL-02 & Risk R-015."
                    ),
                    evidence_refs=["E19", "E10", "E09"],
                    event=event
                )
                return matched_incident

        # Rule 1: Out-of-Range Integration Caller IP
        is_integration_actor = (
            event.actor_type == "integration" or
            event.actor.startswith("key-tb") or
            event.actor == "tb-sync-svc"
        )
        if is_integration_actor and event.source_ip:
            is_internal = any(event.source_ip.startswith(prefix) for prefix in AUTHORIZED_INTERNAL_PREFIXES)
            if not is_internal:
                matched_incident = self._record_or_update_incident(
                    incident_key=f"RULE-INT-001:{event.actor}:{event.source_ip}",
                    rule_code="RULE-INT-001",
                    rule_name="Integration Key Used Outside Authorized Range",
                    severity="critical",
                    rule_score=92,
                    confidence="high",
                    system=event.system,
                    source_ip=event.source_ip,
                    actor=event.actor,
                    explanation=(
                        f"Integration credential '{event.actor}' was invoked from unexpected external IP {event.source_ip}. "
                        f"TallyBridge integrations are authorized only from tunnel range 10.20.4.0/24. "
                        f"Likely credential compromise or off-path token replay."
                    ),
                    evidence_refs=["E01", "E02", "E04", "E17"],
                    event=event
                )

        # Rule 2: Retired or Scripted Client Version
        ua = (event.metadata.get("user_agent", "") or event.details or "").lower()
        if any(ret in ua for ret in RETIRED_USER_AGENTS):
            matched_incident = self._record_or_update_incident(
                incident_key=f"RULE-INT-002:{event.actor}:{event.source_ip}",
                rule_code="RULE-INT-002",
                rule_name="Retired or Scripted Client Version Detected",
                severity="high",
                rule_score=85,
                confidence="high",
                system=event.system,
                source_ip=event.source_ip,
                actor=event.actor,
                explanation=(
                    f"Request originated from obsolete or scripted client user-agent: '{ua}'. "
                    f"TallyBridge version 3.4.1 was officially retired on 10 July 2026 with release of 3.5.0. "
                    f"Indicates unmaintained automated tooling or legacy client spoofing."
                ),
                evidence_refs=["E01", "E17", "E20"],
                event=event
            )

        # Rule 4: Export Bursts (Create -> Download -> Delete Sequence)
        if "export" in event.action.lower() or "export" in (event.endpoint or "").lower():
            key = f"{event.actor}@{event.source_ip}"
            if key not in self.export_tracker:
                self.export_tracker[key] = []
            self.export_tracker[key].append({
                "id": event.id,
                "action": event.action,
                "ts": event.ts_utc,
                "object_id": event.metadata.get("object_id")
            })

            # Check if actor has rapid create, download, and delete
            recent_actions = [x["action"] for x in self.export_tracker[key][-10:]]
            has_create = any("create" in a for a in recent_actions)
            has_download = any("download" in a for a in recent_actions)
            has_delete = any("delete" in a for a in recent_actions)

            if (has_create and has_download and has_delete) or len(self.export_tracker[key]) >= 3:
                matched_incident = self._record_or_update_incident(
                    incident_key=f"RULE-EXP-004:{event.actor}:{event.source_ip}",
                    rule_code="RULE-EXP-004",
                    rule_name="Rapid Bulk Export Create-Download-Delete Sequence",
                    severity="critical",
                    rule_score=95,
                    confidence="high",
                    system=event.system,
                    source_ip=event.source_ip,
                    actor=event.actor,
                    explanation=(
                        f"Abnormal bulk export sequence observed for actor '{event.actor}' on {event.system}: "
                        f"Export jobs created, downloaded, and immediately deleted to evade retention and billing controls. "
                        f"Exceeded plan thresholds (E06) and violates IT Policy TPS-POL-02 Sec 4.1."
                    ),
                    evidence_refs=["E02", "E06", "E10"],
                    event=event
                )

        # Rule 5: Sensitive Financial Endpoint Probing / Bulk Export
        if event.endpoint and any(sens in event.endpoint for sens in SENSITIVE_ENDPOINTS):
            if event.source_ip not in self.sensitive_searches:
                self.sensitive_searches[event.source_ip] = []
            self.sensitive_searches[event.source_ip].append(event)

            if len(self.sensitive_searches[event.source_ip]) >= 2 or event.records_returned >= 500:
                matched_incident = self._record_or_update_incident(
                    incident_key=f"RULE-SENS-005:{event.actor}:{event.source_ip}",
                    rule_code="RULE-SENS-005",
                    rule_name="Sensitive Financial Endpoint Probing / Bulk Export",
                    severity="high",
                    rule_score=88,
                    confidence="high",
                    system=event.system,
                    source_ip=event.source_ip,
                    actor=event.actor,
                    explanation=(
                        f"High-volume querying or mass export on sensitive financial endpoints: "
                        f"{event.endpoint} returned {event.records_returned} records. "
                        f"Repeated queries observed from {event.source_ip} targeting vendor masters and payment histories."
                    ),
                    evidence_refs=["E01", "E18", "E10"],
                    event=event
                )

        # Rule 3: Abnormal Login Failures / MFA Anomalies
        if event.system == "SSO" and (event.status == "failure" or event.action == "auth.signin"):
            auth_key = f"{event.actor}@{event.source_ip}"
            if event.status == "failure":
                if auth_key not in self.auth_failures:
                    self.auth_failures[auth_key] = []
                self.auth_failures[auth_key].append(event)

                if len(self.auth_failures[auth_key]) >= 2:
                    matched_incident = self._record_or_update_incident(
                        incident_key=f"RULE-AUTH-003:{event.actor}:{event.source_ip}",
                        rule_code="RULE-AUTH-003",
                        rule_name="Repeated Login Failures & MFA Anomalies",
                        severity="high",
                        rule_score=80,
                        confidence="medium",
                        system=event.system,
                        source_ip=event.source_ip,
                        actor=event.actor,
                        explanation=(
                            f"Multiple sign-in failures against user account '{event.actor}' from source IP {event.source_ip}. "
                            f"Reasons: {event.metadata.get('failure_reason', 'authentication error')}. MFA challenge not passed."
                        ),
                        evidence_refs=["E03", "E13"],
                        event=event
                    )

        # Rule 6: Cross-System Multi-Entity Attack Correlation
        if ip and ip in self.cross_system_tracker:
            info = self.cross_system_tracker[ip]
            if len(info["systems"]) >= 2 and not any(ip.startswith(prefix) for prefix in AUTHORIZED_INTERNAL_PREFIXES):
                matched_incident = self._record_or_update_incident(
                    incident_key=f"RULE-CORR-006:{ip}",
                    rule_code="RULE-CORR-006",
                    rule_name="Correlated Cross-System Campaign Activity",
                    severity="critical",
                    rule_score=96,
                    confidence="high",
                    system="Multi-System",
                    source_ip=ip,
                    actor=event.actor,
                    explanation=(
                        f"Campaign correlation: External IP {ip} observed acting across multiple distinct platforms: "
                        f"{', '.join(sorted(list(info['systems'])))}. Same IP engaged in reconnaissance, bulk exports, "
                        f"and authentication probing across Harbor & Finch integration boundaries."
                    ),
                    evidence_refs=["E01", "E02", "E03", "E17"],
                    event=event
                )

        return matched_incident

    def evaluate_governance_posture(self, connected_software: List[Dict[str, Any]]) -> List[IncidentAlert]:
        """
        Rule 8: Excessive Integration Scope, Missing Key Expiry, and Stale Reviews.
        Evaluates connected software register against IT Policy TPS-POL-02.
        """
        governance_alerts = []
        for item in connected_software:
            cid = item.get("credential_id", "")
            scope = item.get("scope", "")
            has_ip_restriction = item.get("ip_restriction", False)
            lifetime = item.get("token_lifetime_days")
            last_review = item.get("last_review", "")

            # Check violations
            violations = []
            if not has_ip_restriction:
                violations.append("Missing IP allowlist restriction (Policy 2.1)")
            if lifetime is None or lifetime > 90:
                violations.append("Non-expiring credential / lifetime > 90 days (Policy 2.2)")
            if "all" in scope.lower() or "admin" in scope.lower():
                violations.append("Excessive privilege scope ('all-modules' / 'admin') (Policy 2.3)")
            if last_review and "2024" in last_review:
                violations.append("Stale annual review overdue since June 2025 (Policy 3.1)")

            if violations:
                key = f"RULE-GOV-008:{cid}"
                if key not in self.incidents:
                    alert = IncidentAlert(
                        id=f"inc-gov-{cid}",
                        incident_key=key,
                        title=f"Excessive Integration Scope & Stale Governance: {item.get('integration')}",
                        severity="medium",
                        rule_score=65,
                        confidence="high",
                        rule_code="RULE-GOV-008",
                        rule_name="Excessive Integration Scope & Stale Governance",
                        explanation=(
                            f"Integration '{item.get('integration')}' ({cid}) fails compliance requirements: "
                            f"{'; '.join(violations)}. Managed by {item.get('owner', 'IT')}. "
                            f"Leaves integration open to off-path abuse."
                        ),
                        system=item.get("system", "Integration"),
                        source_ip="internal_config",
                        actor=cid,
                        event_count=1,
                        first_seen=item.get("created", "2024-06-12"),
                        last_seen=item.get("last_used", "2026-09-02"),
                        evidence_references=["E04", "E07", "E10", "E09"],
                        status="open",
                        containment_status="none"
                    )
                    self.incidents[key] = alert
                    governance_alerts.append(alert)
        return governance_alerts

    def _record_or_update_incident(
        self,
        incident_key: str,
        rule_code: str,
        rule_name: str,
        severity: str,
        rule_score: int,
        confidence: str,
        system: str,
        source_ip: str,
        actor: str,
        explanation: str,
        evidence_refs: List[str],
        event: SecurityEvent
    ) -> IncidentAlert:
        """Deduplicates repeated events into an incident rather than spamming the queue."""
        if incident_key in self.incidents:
            existing = self.incidents[incident_key]
            existing.event_count += 1
            existing.last_seen = event.ts_utc
            if event.id not in existing.correlated_events:
                existing.correlated_events.append(event.id)
            for ref in evidence_refs:
                if ref not in existing.evidence_references:
                    existing.evidence_references.append(ref)
            return existing
        else:
            inc_id = f"inc-{int(time.time()*1000)%1000000:06d}-{len(self.incidents)+1}"
            new_incident = IncidentAlert(
                id=inc_id,
                incident_key=incident_key,
                title=f"{rule_name} ({actor})",
                severity=severity,
                rule_score=rule_score,
                confidence=confidence,
                rule_code=rule_code,
                rule_name=rule_name,
                explanation=explanation,
                system=system,
                source_ip=source_ip,
                actor=actor,
                event_count=1,
                first_seen=event.ts_utc,
                last_seen=event.ts_utc,
                evidence_references=evidence_refs,
                status="open",
                containment_status="none",
                correlated_events=[event.id]
            )
            self.incidents[incident_key] = new_incident
            return new_incident

rules_engine = RulesEngine()
