import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from .models import ContainmentRequest, ContainmentAuditRecord

class ContainmentService:
    def __init__(self):
        # Active simulated blocks in simulation memory
        self.blocked_ips: set[str] = set()
        self.revoked_credentials: set[str] = set()
        self.suspended_integrations: set[str] = set()
        self.locked_users: set[str] = set()
        self.audit_log: List[ContainmentAuditRecord] = []

    def reset(self):
        self.blocked_ips.clear()
        self.revoked_credentials.clear()
        self.suspended_integrations.clear()
        self.locked_users.clear()
        self.audit_log.clear()

    def is_blocked(self, ip: Optional[str] = None, actor: Optional[str] = None, integration: Optional[str] = None) -> tuple[bool, str]:
        """Checks if an event's IP or credential is under simulated containment."""
        if ip and ip in self.blocked_ips:
            return True, f"Simulated Firewall: Blocked traffic from quarantined IP {ip}"
        if actor and actor in self.revoked_credentials:
            return True, f"Simulated Identity Gateway: Revoked API key / credential {actor}"
        if actor and actor in self.locked_users:
            return True, f"Simulated SSO: Suspended compromised account {actor}"
        if integration and integration in self.suspended_integrations:
            return True, f"Simulated API Gateway: Integration {integration} is suspended"
        return False, ""

    def execute_containment(self, req: ContainmentRequest) -> ContainmentAuditRecord:
        """
        Executes a simulated quarantine or block action.
        Only updates internal simulation state. Never connects to real network or cloud.
        """
        now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        audit_id = f"aud-{int(time.time()*1000)%1000000:06d}-{len(self.audit_log)+1}"

        explanation_map = {
            "ip": f"Simulated network border ACL rule added dropping all packets from {req.target_value}.",
            "api_key": f"Simulated credential revocation executed in API Gateway for key {req.target_value}. All subsequent requests return 401/403.",
            "integration": f"Simulated connector pipeline suspended for {req.target_value}. Data sync halts immediately.",
            "user": f"Simulated directory lock applied to account {req.target_value}. Active session tokens invalidated."
        }
        explanation = explanation_map.get(req.target_type, f"Simulated isolation executed for {req.target_value}.")

        # Apply to simulated state
        if req.target_type == "ip":
            self.blocked_ips.add(req.target_value)
        elif req.target_type == "api_key":
            self.revoked_credentials.add(req.target_value)
        elif req.target_type == "integration":
            self.suspended_integrations.add(req.target_value)
        elif req.target_type == "user":
            self.locked_users.add(req.target_value)

        audit_record = ContainmentAuditRecord(
            id=audit_id,
            timestamp=now_str,
            incident_id=req.incident_id,
            target_type=req.target_type,
            target_value=req.target_value,
            action_type=req.action_type,
            reason=req.reason,
            status="SIMULATED_ACTIVE",
            operator=req.operator,
            explanation=explanation,
            notice="SIMULATED — no real system changed.",
            can_rollback=True
        )
        self.audit_log.insert(0, audit_record)
        return audit_record

    def rollback_containment(self, audit_id: str, operator: str = "secops_analyst") -> Optional[ContainmentAuditRecord]:
        """Rolls back a prior simulated containment action and logs the reversal."""
        record = next((r for r in self.audit_log if r.id == audit_id), None)
        if not record or record.status != "SIMULATED_ACTIVE":
            return None

        # Revert simulated state
        if record.target_type == "ip":
            self.blocked_ips.discard(record.target_value)
        elif record.target_type == "api_key":
            self.revoked_credentials.discard(record.target_value)
        elif record.target_type == "integration":
            self.suspended_integrations.discard(record.target_value)
        elif record.target_type == "user":
            self.locked_users.discard(record.target_value)

        record.status = "ROLLED_BACK"
        record.can_rollback = False

        # Add audit entry for rollback
        now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        rollback_entry = ContainmentAuditRecord(
            id=f"aud-rb-{int(time.time()*1000)%1000000:06d}",
            timestamp=now_str,
            incident_id=record.incident_id,
            target_type=record.target_type,
            target_value=record.target_value,
            action_type="rollback",
            reason=f"Rollback of containment action {audit_id}",
            status="COMPLETED",
            operator=operator,
            explanation=f"Reverted simulated restriction on {record.target_value}.",
            notice="SIMULATED — no real system changed.",
            can_rollback=False
        )
        self.audit_log.insert(0, rollback_entry)
        return record

    def get_active_blocks_count(self) -> int:
        return len(self.blocked_ips) + len(self.revoked_credentials) + len(self.suspended_integrations) + len(self.locked_users)

    def get_blocked_targets(self) -> Dict[str, List[str]]:
        return {
            "ips": sorted(list(self.blocked_ips)),
            "credentials": sorted(list(self.revoked_credentials)),
            "integrations": sorted(list(self.suspended_integrations)),
            "users": sorted(list(self.locked_users))
        }

    def get_audit_trail(self) -> List[ContainmentAuditRecord]:
        return self.audit_log

containment_service = ContainmentService()
