import asyncio
import math
import random
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Set
from fastapi import WebSocket

from .models import SecurityEvent, IncidentAlert, ContainmentRequest, TimeIPBucket
from .evidence_loader import evidence_loader
from .rules_engine import rules_engine
from .containment import containment_service
from .metrics import metrics_collector

# Fictional reserved IP subnets (RFC 5737 / RFC 1918 / RFC 6598)
INTERNAL_IPS = [f"172.16.8.{i}" for i in range(10, 65)]
TUNNEL_IPS = [f"10.20.4.{i}" for i in range(10, 18)]
RESERVED_SUSPICIOUS_IPS = ["198.18.7.41", "198.18.7.58", "198.18.7.77", "198.51.100.41", "203.0.113.58"]
SYSTEMS = ["LedgerOne", "HelpDeskr", "BlueVault", "SSO", "TallyBridge"]
ROUTINE_USERS = ["m.sundar", "f.dsouza", "s.iyer", "a.nair", "p.shah", "n.sharma", "m.banerjee", "s.das"]

# Weighted attack type pool: (type_name, weight)
ATTACK_TYPES = [
    ("ip_recon", 25),
    ("export_burst", 25),
    ("mfa_anomaly", 15),
    ("payment_search", 20),
    ("bank_alteration", 15),
]
ATTACK_TYPE_NAMES = [a[0] for a in ATTACK_TYPES]
ATTACK_TYPE_WEIGHTS = [a[1] for a in ATTACK_TYPES]

# False-positive internal IPs that look "unusual" but are legit
FALSE_POSITIVE_INTERNAL_IPS = ["172.16.99.5", "10.20.4.250", "172.16.55.88"]


class EventSimulator:
    def __init__(self):
        self.state = "running"  # "running", "paused", "stopped"
        self.mode = "synthetic"  # "synthetic" or "replay"
        self.speed = 1.0  # multiplier: 0.25, 0.5, 1.0, 2.0
        self.active_scenario: Optional[str] = None
        self.active_connections: Set[WebSocket] = set()
        self.replay_index = 0
        self.recent_events: List[SecurityEvent] = []
        self.max_recent_events = 250
        self.running_task: Optional[asyncio.Task] = None
        self.scenario_queue: List[Dict[str, Any]] = []

        # Pre-seed rolling time buckets with baseline traffic so bar chart is lively from start
        self.time_buckets_history: Dict[str, Dict[str, Any]] = self._init_historical_buckets()
        self.autonomous_cycle_step = 0

        # --- Probability-based attack intensity state ---
        self._attack_intensity: float = 0.0  # 0.0 = calm, 1.0 = peak
        self._events_since_last_surge: int = 0
        self._next_surge_at: int = random.randint(15, 40)
        self._surge_ramp_remaining: int = 0  # events left in ramp-up phase
        self._surge_target_intensity: float = 0.0
        self._decay_rate: float = 0.0  # exponential decay per event

        # --- Auto-block mode ---
        self.auto_block_enabled: bool = False

        # --- Blocked events tracking ---
        self.blocked_events: List[SecurityEvent] = []
        self._max_blocked_events: int = 200

    def _init_historical_buckets(self) -> Dict[str, Dict[str, Any]]:
        """Pre-seeds the past 6 time buckets with realistic normal baseline counts."""
        buckets: Dict[str, Dict[str, Any]] = {}
        now = datetime.utcnow()
        for i in range(7, 0, -1):
            bucket_time = (now - timedelta(minutes=i * 2)).strftime("%Y-%m-%dT%H:%M:00Z")
            # Baseline routine tunnel & internal IPs
            for ip, sys, count in [
                ("10.20.4.12", "LedgerOne", random.randint(4, 9)),
                ("172.16.8.22", "SSO", random.randint(3, 7)),
                ("172.16.9.40", "BlueVault", random.randint(2, 5)),
                ("10.20.4.15", "HelpDeskr", random.randint(1, 4)),
            ]:
                key = f"{bucket_time}::{ip}"
                buckets[key] = {
                    "timestamp_bucket": bucket_time,
                    "ip": ip,
                    "event_count": count,
                    "system": sys,
                    "severity": "normal",
                    "is_suspicious": False,
                    "event_ids": []
                }
        return buckets

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send initial snapshot
        await self.broadcast_state()

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_state(self):
        """Sends current state, metrics, and recent events to all clients."""
        if not self.active_connections:
            return

        metrics = metrics_collector.get_dashboard_metrics(
            open_incidents_count=len(rules_engine.incidents),
            open_incidents=list(rules_engine.incidents.values()),
            simulation_state=self.state,
            simulation_mode=self.mode,
            current_speed=self.speed,
            active_scenario=self.active_scenario,
            auto_block_enabled=self.auto_block_enabled
        )

        payload = {
            "type": "METRICS_UPDATE",
            "metrics": metrics.model_dump(),
            "incidents": [inc.model_dump() for inc in list(rules_engine.incidents.values())[-30:]],
            "active_blocks": containment_service.get_audit_trail()[:10],
            "time_buckets": self.get_time_ip_buckets()
        }

        dead_connections = set()
        for conn in self.active_connections:
            try:
                await conn.send_json(payload)
            except Exception:
                dead_connections.add(conn)
        self.active_connections -= dead_connections

    async def broadcast_event(self, event: SecurityEvent, alert: Optional[IncidentAlert] = None):
        """Broadcasts a newly processed event and optional incident alert."""
        self.recent_events.insert(0, event)
        if len(self.recent_events) > self.max_recent_events:
            self.recent_events.pop()

        # Update real-time rolling bucket
        ts_bucket = event.ts_utc[:16] + ":00Z"
        bucket_key = f"{ts_bucket}::{event.source_ip}"
        if bucket_key not in self.time_buckets_history:
            self.time_buckets_history[bucket_key] = {
                "timestamp_bucket": ts_bucket,
                "ip": event.source_ip,
                "event_count": 0,
                "system": event.system,
                "severity": "critical" if event.highlighted else "normal",
                "is_suspicious": event.highlighted,
                "event_ids": []
            }
        self.time_buckets_history[bucket_key]["event_count"] += 1
        self.time_buckets_history[bucket_key]["event_ids"].append(event.id)
        if event.highlighted:
            self.time_buckets_history[bucket_key]["is_suspicious"] = True
            self.time_buckets_history[bucket_key]["severity"] = "critical"

        payload = {
            "type": "NEW_EVENT",
            "event": event.model_dump(),
            "alert": alert.model_dump() if alert else None,
            "metrics": metrics_collector.get_dashboard_metrics(
                open_incidents_count=len(rules_engine.incidents),
                open_incidents=list(rules_engine.incidents.values()),
                simulation_state=self.state,
                simulation_mode=self.mode,
                current_speed=self.speed,
                active_scenario=self.active_scenario,
                auto_block_enabled=self.auto_block_enabled
            ).model_dump(),
            "time_buckets": self.get_time_ip_buckets()
        }

        dead_connections = set()
        for conn in self.active_connections:
            try:
                await conn.send_json(payload)
            except Exception:
                dead_connections.add(conn)
        self.active_connections -= dead_connections

    def set_control(self, action: str, speed: Optional[float] = None, mode: Optional[str] = None, scenario: Optional[str] = None):
        if action == "start" or action == "resume":
            self.state = "running"
        elif action == "pause":
            self.state = "paused"
        elif action == "stop":
            self.state = "stopped"
        elif action == "reset":
            self.state = "running"
            self.replay_index = 0
            self.autonomous_cycle_step = 0
            self.active_scenario = None
            self.scenario_queue.clear()
            self.recent_events.clear()
            self.blocked_events.clear()
            self.time_buckets_history = self._init_historical_buckets()
            # Reset attack intensity state
            self._attack_intensity = 0.0
            self._events_since_last_surge = 0
            self._next_surge_at = random.randint(15, 40)
            self._surge_ramp_remaining = 0
            self._surge_target_intensity = 0.0
            self._decay_rate = 0.0
            rules_engine.reset()
            containment_service.reset()
            metrics_collector.reset()
        elif action == "set_speed" and speed:
            self.speed = float(speed)
        elif action == "set_mode" and mode:
            self.mode = mode
            if mode == "replay":
                self.replay_index = 0
        elif action == "inject_scenario" and scenario:
            self.inject_scenario(scenario)
        elif action == "toggle_auto_block":
            self.auto_block_enabled = not self.auto_block_enabled

    def inject_scenario(self, scenario_name: str):
        """Prepares a paced, sequential sequence modeled on the CR-26-047 evidence."""
        self.active_scenario = scenario_name

        if scenario_name == "scenario_1":
            # TallyBridge unexpected IP recon (slowly striking in)
            self.scenario_queue = [
                {"action": "api.get", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/v2/me", "status": "200", "records": 1,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Probing endpoint identity)", "highlighted": True},
                {"action": "api.get", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/v2/schema", "status": "200", "records": 1,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Schema introspection / table discovery)", "highlighted": True},
                {"action": "api.get", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/v2/vendors?limit=1", "status": "200", "records": 1,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Testing vendor pagination boundaries)", "highlighted": True},
            ]
        elif scenario_name == "scenario_2":
            # HelpDeskr export burst: create -> download -> delete (paced sequence)
            self.scenario_queue = [
                {"action": "export.create", "system": "HelpDeskr", "actor": "tb-sync-svc", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/helpdesk/exports/EXP-5410", "status": "ok", "records": 1500,
                 "details": "Bulk ticket export job EXP-5410 created by integration", "highlighted": True},
                {"action": "export.download", "system": "HelpDeskr", "actor": "tb-sync-svc", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/helpdesk/exports/EXP-5410/download", "status": "ok", "records": 1500,
                 "details": "Bulk ticket export EXP-5410 downloaded", "highlighted": True},
                {"action": "export.delete", "system": "HelpDeskr", "actor": "tb-sync-svc", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/helpdesk/exports/EXP-5410", "status": "ok", "records": 0,
                 "details": "Bulk ticket export EXP-5410 deleted to remove forensic trail", "highlighted": True},
                {"action": "export.create", "system": "HelpDeskr", "actor": "tb-sync-svc", "actor_type": "integration",
                 "ip": "198.18.7.58", "endpoint": "/helpdesk/exports/EXP-5411", "status": "ok", "records": 1600,
                 "details": "Bulk ticket export job EXP-5411 created from second IP 198.18.7.58", "highlighted": True},
                {"action": "export.download", "system": "HelpDeskr", "actor": "tb-sync-svc", "actor_type": "integration",
                 "ip": "198.18.7.58", "endpoint": "/helpdesk/exports/EXP-5411/download", "status": "ok", "records": 1600,
                 "details": "Bulk ticket export EXP-5411 downloaded", "highlighted": True},
                {"action": "export.delete", "system": "HelpDeskr", "actor": "tb-sync-svc", "actor_type": "integration",
                 "ip": "198.18.7.58", "endpoint": "/helpdesk/exports/EXP-5411", "status": "error", "records": 0,
                 "details": "Bulk ticket export EXP-5411 deletion failed (timeout error - residual evidence)", "highlighted": True},
            ]
        elif scenario_name == "scenario_3":
            # LedgerOne bulk export & repeated payment searches
            self.scenario_queue = [
                {"action": "api.post", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/v2/vendors/export", "status": "200", "records": 9840,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Mass vendor dump POST - 9,840 records)", "highlighted": True},
                {"action": "api.get", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/v2/exports/9931/download", "status": "200", "records": 9840,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Exfiltration download completed)", "highlighted": True},
                {"action": "api.get", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.41", "endpoint": "/v2/payments/search", "status": "200", "records": 330,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Targeted payment query batch 1)", "highlighted": True},
                {"action": "api.get", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "198.18.7.58", "endpoint": "/v2/payments/search", "status": "200", "records": 330,
                 "details": "User-Agent: TallyBridge-Sync/3.4.1 (Targeted payment query batch 2)", "highlighted": True},
            ]
        elif scenario_name == "scenario_4":
            # Unapproved vendor bank update
            self.scenario_queue = [
                {"action": "vendor.change.bank_account", "system": "LedgerOne", "actor": "key-tb-07", "actor_type": "integration",
                 "ip": "10.20.4.77", "endpoint": "/v2/vendors/V-0412/bank_account", "status": "200", "records": 1,
                 "details": "Vendor Coastal Packaging Ltd (V-0412): bank_account changed ****4417 -> ****9083. approval_ref is EMPTY.",
                 "highlighted": True,
                 "metadata": {"vendor_id": "V-0412", "vendor_name": "Coastal Packaging Ltd", "approval_ref": "", "field": "bank_account"}}
            ]
        elif scenario_name == "scenario_5":
            # Failed sign-ins & MFA anomaly on a.kapoor
            self.scenario_queue = [
                {"action": "auth.signin", "system": "SSO", "actor": "a.kapoor", "actor_type": "user",
                 "ip": "198.18.7.77", "endpoint": "/sso/login", "status": "failure", "records": 1,
                 "details": "City: Mumbai, Reason: bad_password, MFA: not_reached", "highlighted": True,
                 "metadata": {"failure_reason": "bad_password", "mfa_result": "not_reached"}},
                {"action": "auth.signin", "system": "SSO", "actor": "a.kapoor", "actor_type": "user",
                 "ip": "198.18.7.77", "endpoint": "/sso/login", "status": "failure", "records": 1,
                 "details": "City: Mumbai, Reason: bad_password, MFA: not_reached", "highlighted": True,
                 "metadata": {"failure_reason": "bad_password", "mfa_result": "not_reached"}},
                {"action": "auth.signin", "system": "SSO", "actor": "a.kapoor", "actor_type": "user",
                 "ip": "198.18.7.77", "endpoint": "/sso/login", "status": "failure", "records": 1,
                 "details": "City: Mumbai, Reason: mfa_failed, MFA: failed", "highlighted": True,
                 "metadata": {"failure_reason": "mfa_failed", "mfa_result": "failed"}},
            ]

    def generate_routine_synthetic_event(self) -> SecurityEvent:
        """Generates realistic normal baseline traffic for Harbor & Finch."""
        now_dt = datetime.utcnow()
        utc_ts = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        local_ts = (now_dt + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M:%S IST")

        event_type = random.choices(
            ["sso_login", "tallybridge_sync", "bluevault_pod", "helpdeskr_read",
             "vendor_approved_update", "ledgerone_payment_view", "nightly_sync", "api_health"],
            weights=[25, 20, 12, 10, 5, 12, 10, 6],
            k=1
        )[0]

        event_id = f"syn-{int(time.time()*1000)%1000000:06d}-{random.randint(100, 999)}"

        if event_type == "sso_login":
            user = random.choice(ROUTINE_USERS)
            ip = random.choice(INTERNAL_IPS)
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="SSO",
                source_ip=ip,
                actor=user,
                actor_type="user",
                action="auth.signin",
                endpoint="/sso/login",
                method="POST",
                records_returned=1,
                status="success",
                details="Authentication successful via password+totp. MFA passed.",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"city": "Chennai", "mfa_result": "passed"}
            )
        elif event_type == "tallybridge_sync":
            ip = random.choice(TUNNEL_IPS)
            endpoint = random.choice(["/v2/invoices", "/v2/payments/status", "/v2/shipments"])
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="LedgerOne",
                source_ip=ip,
                actor="key-tb-07",
                actor_type="integration",
                action="api.get",
                endpoint=endpoint,
                method="GET",
                records_returned=random.randint(5, 50),
                status="200",
                details="Routine batch sync. User-Agent: TallyBridge-Sync/3.5.0",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"user_agent": "TallyBridge-Sync/3.5.0"}
            )
        elif event_type == "bluevault_pod":
            ip = "172.16.9.40"
            pod_id = f"pod-{random.randint(1000, 9999)}.pdf"
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="BlueVault",
                source_ip=ip,
                actor="key:bvk-7f3a",
                actor_type="integration",
                action="file.read",
                endpoint=f"/customer-docs/pods/{pod_id}",
                method="GET",
                records_returned=1,
                status="ok",
                details=f"Read document {pod_id} ({random.randint(100, 800)} KB)",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"bytes": random.randint(100000, 800000)}
            )
        elif event_type == "helpdeskr_read":
            user = random.choice(ROUTINE_USERS)
            ip = random.choice(INTERNAL_IPS)
            tkt_id = f"TKT-{random.randint(46000, 52000)}"
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="HelpDeskr",
                source_ip=ip,
                actor=user,
                actor_type="user",
                action="ticket.read",
                endpoint=f"/helpdesk/tickets/{tkt_id}",
                method="GET",
                records_returned=1,
                status="ok",
                details=f"Support agent read ticket {tkt_id}",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"object_id": tkt_id}
            )
        elif event_type == "ledgerone_payment_view":
            user = random.choice(ROUTINE_USERS)
            ip = random.choice(INTERNAL_IPS)
            pay_id = f"PAY-{random.randint(2024001, 2024999)}"
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="LedgerOne",
                source_ip=ip,
                actor=user,
                actor_type="user",
                action="payment.view",
                endpoint=f"/v2/payments/{pay_id}",
                method="GET",
                records_returned=1,
                status="200",
                details=f"Finance team reviewed payment record {pay_id}.",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"pay_id": pay_id}
            )
        elif event_type == "nightly_sync":
            ip = random.choice(TUNNEL_IPS)
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="TallyBridge",
                source_ip=ip,
                actor="svc-tallybridge-nightly",
                actor_type="integration",
                action="sync.batch",
                endpoint="/tally/batch/nightly",
                method="POST",
                records_returned=random.randint(80, 350),
                status="200",
                details=f"Nightly reconciliation batch. {random.randint(80, 350)} GL entries synced.",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"batch_type": "nightly_gl_reconcile"}
            )
        elif event_type == "api_health":
            ip = random.choice(TUNNEL_IPS)
            system = random.choice(SYSTEMS)
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system=system,
                source_ip=ip,
                actor="svc-healthcheck",
                actor_type="integration",
                action="health.check",
                endpoint="/health",
                method="GET",
                records_returned=0,
                status="200",
                details=f"{system} health probe OK. Latency: {random.randint(2,15)}ms",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"probe": "liveness"}
            )
        else:
            # Vendor approved update
            user = random.choice(["f.dsouza", "m.sundar"])
            ip = random.choice(INTERNAL_IPS)
            approval = f"APR-{random.randint(1300, 1499)}"
            event = SecurityEvent(
                id=event_id,
                ts_utc=utc_ts,
                ts_local=local_ts,
                system="LedgerOne",
                source_ip=ip,
                actor=user,
                actor_type="user",
                action="vendor.change.contact_email",
                endpoint="/v2/vendors/change",
                method="PATCH",
                records_returned=1,
                status="ok",
                details=f"Vendor contact email updated with approval reference {approval}",
                is_replayed=False,
                evidence_id=None,
                highlighted=False,
                metadata={"approval_ref": approval, "field": "contact_email"}
            )

        return event

    # ------------------------------------------------------------------ #
    #  Probability-based attack intensity engine                          #
    # ------------------------------------------------------------------ #

    def _update_attack_intensity(self) -> None:
        """Advance the internal attack-intensity state machine by one tick."""
        self._events_since_last_surge += 1

        # If we are in a ramp-up phase, increase intensity toward target
        if self._surge_ramp_remaining > 0:
            step = (self._surge_target_intensity - self._attack_intensity) / self._surge_ramp_remaining
            self._attack_intensity = min(1.0, self._attack_intensity + step)
            self._surge_ramp_remaining -= 1
            if self._surge_ramp_remaining == 0:
                # Ramp complete — start exponential decay
                decay_events = random.randint(8, 15)
                # decay_rate chosen so intensity halves every ~decay_events/3 events
                self._decay_rate = -math.log(0.05) / decay_events  # reaches ~5% at end
        elif self._attack_intensity > 0.02:
            # Exponential decay toward calm
            self._attack_intensity *= math.exp(-self._decay_rate)
            if self._attack_intensity < 0.02:
                self._attack_intensity = 0.0
        else:
            self._attack_intensity = 0.0

        # Decide whether a new surge begins
        if self._surge_ramp_remaining == 0 and self._events_since_last_surge >= self._next_surge_at:
            self._surge_target_intensity = random.uniform(0.6, 1.0)
            self._surge_ramp_remaining = random.randint(2, 3)
            self._events_since_last_surge = 0
            self._next_surge_at = random.randint(15, 40)

    def _should_inject_attack(self) -> bool:
        """Roll dice to decide whether this tick is a suspicious event."""
        if self._attack_intensity > 0.05:
            # During attack wave: probability 30-60% scaled by intensity
            prob = 0.30 + 0.30 * self._attack_intensity
        else:
            # Calm period: 5-8% base chance
            prob = random.uniform(0.05, 0.08)
        return random.random() < prob

    def _generate_false_positive_event(self) -> SecurityEvent:
        """Generate a benign event that *looks* suspicious but is actually legit."""
        now_dt = datetime.utcnow()
        utc_ts = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        local_ts = (now_dt + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M:%S IST")
        event_id = f"fp-{int(time.time()*1000)%1000000:06d}-{random.randint(100, 999)}"

        fp_type = random.choice(["unusual_ip_login", "large_authorized_export"])
        if fp_type == "unusual_ip_login":
            user = random.choice(ROUTINE_USERS)
            ip = random.choice(FALSE_POSITIVE_INTERNAL_IPS)
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="SSO", source_ip=ip, actor=user, actor_type="user",
                action="auth.signin", endpoint="/sso/login", method="POST",
                records_returned=1, status="success",
                details=f"Login from unusual internal subnet {ip} — DR failover range. MFA passed.",
                is_replayed=False, evidence_id=None, highlighted=False,
                metadata={"city": "Chennai", "mfa_result": "passed", "note": "DR subnet"}
            )
        else:
            user = random.choice(["f.dsouza", "m.sundar"])
            ip = random.choice(INTERNAL_IPS)
            records = random.randint(800, 2500)
            approval = f"APR-{random.randint(1500, 1999)}"
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="LedgerOne", source_ip=ip, actor=user, actor_type="user",
                action="api.post", endpoint="/v2/vendors/export", method="POST",
                records_returned=records, status="200",
                details=f"Authorized quarterly vendor export ({records} records). Approval ref: {approval}.",
                is_replayed=False, evidence_id=None, highlighted=False,
                metadata={"approval_ref": approval, "export_type": "quarterly_audit"}
            )

    def _generate_attack_event(self) -> SecurityEvent:
        """Generate a suspicious / malicious event chosen from the weighted attack pool."""
        now_dt = datetime.utcnow()
        utc_ts = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        local_ts = (now_dt + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M:%S IST")
        event_id = f"atk-{int(time.time()*1000)%1000000:06d}-{random.randint(100, 999)}"
        attacker_ip = random.choice(RESERVED_SUSPICIOUS_IPS)

        attack_type = random.choices(ATTACK_TYPE_NAMES, weights=ATTACK_TYPE_WEIGHTS, k=1)[0]

        if attack_type == "ip_recon":
            endpoint = random.choice(["/v2/me", "/v2/schema", "/v2/vendors?limit=1", "/v2/config"])
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="LedgerOne", source_ip=attacker_ip,
                actor="key-tb-07", actor_type="integration",
                action="api.get", endpoint=endpoint, method="GET",
                records_returned=1, status="200",
                details=f"User-Agent: TallyBridge-Sync/3.4.1 (External IP reconnaissance — {endpoint})",
                is_replayed=False, evidence_id=None, highlighted=True,
                metadata={"user_agent": "TallyBridge-Sync/3.4.1"}
            )
        elif attack_type == "export_burst":
            export_id = f"EXP-{random.randint(5400, 5999)}"
            action_choice = random.choice(["export.create", "export.download", "export.delete"])
            records = random.randint(800, 3000) if action_choice != "export.delete" else 0
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="HelpDeskr", source_ip=attacker_ip,
                actor="tb-sync-svc", actor_type="integration",
                action=action_choice,
                endpoint=f"/helpdesk/exports/{export_id}" + ("/download" if action_choice == "export.download" else ""),
                method="POST" if action_choice == "export.create" else "GET" if action_choice == "export.download" else "DELETE",
                records_returned=records, status="ok",
                details=f"Bulk ticket {action_choice.split('.')[1]} job {export_id} from external IP {attacker_ip}",
                is_replayed=False, evidence_id=None, highlighted=True,
                metadata={"export_id": export_id}
            )
        elif attack_type == "mfa_anomaly":
            reason = random.choice(["bad_password", "mfa_failed", "mfa_timeout"])
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="SSO", source_ip=attacker_ip,
                actor="a.kapoor", actor_type="user",
                action="auth.signin", endpoint="/sso/login", method="POST",
                records_returned=1, status="failure",
                details=f"City: Mumbai, Reason: {reason}, MFA challenge failed from external IP",
                is_replayed=False, evidence_id=None, highlighted=True,
                metadata={"failure_reason": reason, "mfa_result": "failed", "city": "Mumbai"}
            )
        elif attack_type == "payment_search":
            records = random.randint(200, 1200)
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="LedgerOne", source_ip=attacker_ip,
                actor="key-tb-07", actor_type="integration",
                action="payment.search",
                endpoint="/v2/payments/search?range=all", method="GET",
                records_returned=records, status="200",
                details=f"Mass payment search across vendor accounts ({records} records returned)",
                is_replayed=False, evidence_id=None, highlighted=True,
                metadata={"search_type": "mass_payment_lookup"}
            )
        else:  # bank_alteration
            vendor_id = f"V-{random.randint(400, 499):04d}"
            vendor_name = random.choice([
                "Coastal Packaging Ltd", "Harbor Freight Supplies", "Meridian Logistics",
                "Sunrise Paper Co", "Delta Marine Parts"
            ])
            return SecurityEvent(
                id=event_id, ts_utc=utc_ts, ts_local=local_ts,
                system="LedgerOne", source_ip=attacker_ip,
                actor="key-tb-07", actor_type="integration",
                action="vendor.change.bank_account",
                endpoint=f"/v2/vendors/{vendor_id}/bank_account", method="PATCH",
                records_returned=1, status="200",
                details=f"Vendor {vendor_name} ({vendor_id}): bank_account changed ****{random.randint(1000,9999)} -> ****{random.randint(1000,9999)}. approval_ref is EMPTY.",
                is_replayed=False, evidence_id=None, highlighted=True,
                metadata={"vendor_id": vendor_id, "vendor_name": vendor_name, "approval_ref": "", "field": "bank_account"}
            )

    def generate_continuous_fluctuating_event(self) -> SecurityEvent:
        """
        Generates continuous, fluctuating security telemetry modeled on the CR-26-047 case.
        Uses probability-based attack injection with an internal intensity model
        instead of a fixed modulo cycle.  Attack types are chosen from a weighted pool
        and attacker IPs are randomised from the reserved suspicious range.
        """
        self.autonomous_cycle_step += 1

        # Advance the attack-intensity state machine
        self._update_attack_intensity()

        # Occasionally (~3% of calm ticks) inject a false positive
        if self._attack_intensity < 0.05 and random.random() < 0.03:
            return self._generate_false_positive_event()

        # Roll dice to decide if this tick is an attack event
        if self._should_inject_attack():
            return self._generate_attack_event()

        # Otherwise emit routine baseline traffic
        return self.generate_routine_synthetic_event()

    def _store_blocked_event(self, event: SecurityEvent) -> None:
        """Track a blocked event (max 200)."""
        self.blocked_events.insert(0, event)
        if len(self.blocked_events) > self._max_blocked_events:
            self.blocked_events.pop()

    def get_time_ip_buckets(self) -> List[Dict[str, Any]]:
        """Returns the rolling time buckets sorted chronologically."""
        return list(self.time_buckets_history.values())[-25:]

    async def simulation_loop(self):
        """Main continuous simulation worker loop with dynamic, human-observable pacing."""
        while True:
            try:
                if self.state == "stopped" or self.state == "paused":
                    await asyncio.sleep(0.5)
                    continue

                event: Optional[SecurityEvent] = None
                t_start = time.time()
                is_scenario_item = False

                # Priority 1: Injected Scenario Items (deliberate dramatic pacing)
                if self.scenario_queue:
                    is_scenario_item = True
                    item = self.scenario_queue.pop(0)
                    now_dt = datetime.utcnow()
                    event = SecurityEvent(
                        id=f"scen-{int(time.time()*1000)%1000000:06d}-{random.randint(10, 99)}",
                        ts_utc=now_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        ts_local=(now_dt + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M:%S IST"),
                        system=item.get("system", "LedgerOne"),
                        source_ip=item.get("ip", "198.18.7.41"),
                        actor=item.get("actor", "key-tb-07"),
                        actor_type=item.get("actor_type", "integration"),
                        action=item.get("action", "api.get"),
                        endpoint=item.get("endpoint"),
                        method=item.get("action", "GET").split(".")[-1].upper(),
                        records_returned=item.get("records", 1),
                        status=item.get("status", "200"),
                        details=item.get("details"),
                        is_replayed=False,
                        evidence_id=None,
                        highlighted=True,
                        metadata=item.get("metadata", {})
                    )
                    if not self.scenario_queue:
                        self.active_scenario = None

                # Priority 2: Replay Mode
                elif self.mode == "replay":
                    replayed_list = evidence_loader.replayed_events
                    if self.replay_index < len(replayed_list):
                        raw = replayed_list[self.replay_index]
                        self.replay_index += 1
                        event = SecurityEvent(**raw)
                    else:
                        # Looped replay
                        self.replay_index = 0
                        await asyncio.sleep(1.5)
                        continue

                # Priority 3: Autonomous Fluctuating Synthetic Mode
                else:
                    event = self.generate_continuous_fluctuating_event()

                if event:
                    # Enforce Simulated Containment Check
                    is_contained, reason = containment_service.is_blocked(
                        ip=event.source_ip,
                        actor=event.actor,
                        integration="TallyBridge-LedgerOne" if "tb" in event.actor else None
                    )
                    if is_contained:
                        event.status = "403_BLOCKED"
                        event.details = f"[SIMULATED CONTAINMENT ACTIVE] {reason}"
                        event.highlighted = True
                        # Track blocked event
                        self._store_blocked_event(event)

                    # Run Detection Rules Engine
                    alert = rules_engine.process_event(event)
                    latency_ms = (time.time() - t_start) * 1000.0 + random.uniform(2.5, 6.0)

                    # Auto-block: if enabled and alert is CRITICAL, auto-contain
                    if self.auto_block_enabled and alert and alert.severity == "critical":
                        # Check if IP/actor is not already blocked
                        already_blocked_ip, _ = containment_service.is_blocked(ip=event.source_ip)
                        already_blocked_actor, _ = containment_service.is_blocked(actor=event.actor)
                        if not already_blocked_ip and not already_blocked_actor:
                            auto_req = ContainmentRequest(
                                incident_id=alert.id,
                                target_type="ip",
                                target_value=event.source_ip,
                                action_type="block",
                                reason=f"Auto-block: {alert.rule_name} (severity={alert.severity})",
                                operator="auto_block_system"
                            )
                            containment_service.execute_containment(auto_req)
                            # Update incident status
                            if alert.incident_key in rules_engine.incidents:
                                rules_engine.incidents[alert.incident_key].containment_status = "simulated_contained"
                                rules_engine.incidents[alert.incident_key].status = "contained"

                    # Track blocked event if status was set to BLOCKED by containment
                    if event.status == "403_BLOCKED" and event not in self.blocked_events:
                        self._store_blocked_event(event)

                    # Update Metrics
                    metrics_collector.record_event(event, latency_ms=latency_ms)

                    # Broadcast over WebSocket
                    await self.broadcast_event(event, alert)

                # Dynamic fluctuating pacing with random jitter:
                # Normal events: ~1.2s at 1.0x
                # Suspicious / Scenario events: ~1.8s at 1.0x (gives dramatic time to observe detection)
                base_delay = 1.8 if (is_scenario_item or (event and event.highlighted)) else 1.2
                jittered_delay = base_delay * random.uniform(0.7, 1.4)
                delay = max(0.08, jittered_delay / max(0.1, self.speed))
                await asyncio.sleep(delay)

            except Exception:
                await asyncio.sleep(1.0)

simulator = EventSimulator()
