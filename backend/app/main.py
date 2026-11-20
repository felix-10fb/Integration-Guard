import asyncio
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import HOST, PORT
from .database import init_db, get_db
from .models import (
    SimulationControl,
    ContainmentRequest,
    RollbackRequest,
    DashboardMetrics,
    IncidentAlert
)
from .evidence_loader import evidence_loader
from .rules_engine import rules_engine
from .containment import containment_service
from .metrics import metrics_collector
from .simulator import simulator
from .case_analysis import CASE_ANALYSIS_DATA

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize local SQLite / Postgres DB
    init_db()
    # Load case evidence metadata safely into memory
    evidence_loader.load_case_evidence()
    # Evaluate baseline connected software governance
    rules_engine.evaluate_governance_posture(evidence_loader.connected_software)
    # Start the continuous event simulation loop in background
    sim_task = asyncio.create_task(simulator.simulation_loop())
    yield
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Integration Guard - CR-26-047 Security Monitoring Prototype",
    description="Runnable security prototype simulating synthetic integration events, detecting suspicious patterns, and demonstrating simulated containment.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for local React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await simulator.connect(websocket)
    try:
        while True:
            # Keep connection alive and accept incoming client commands
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        simulator.disconnect(websocket)
    except Exception:
        simulator.disconnect(websocket)

@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "app": "Integration Guard",
        "simulation_state": simulator.state,
        "mode": simulator.mode,
        "speed": simulator.speed,
        "active_clients": len(simulator.active_connections)
    }

@app.get("/api/manifest")
def get_evidence_manifest():
    """Returns safe manifest of evidence files in the case archive."""
    return {
        "case_id": "CR-26-047",
        "archive_files": evidence_loader.get_archive_manifest()
    }

@app.get("/api/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics():
    return metrics_collector.get_dashboard_metrics(
        open_incidents_count=len(rules_engine.incidents),
        open_incidents=list(rules_engine.incidents.values()),
        simulation_state=simulator.state,
        simulation_mode=simulator.mode,
        current_speed=simulator.speed,
        active_scenario=simulator.active_scenario,
        auto_block_enabled=simulator.auto_block_enabled
    )

@app.get("/api/events")
def get_events(limit: int = 100):
    return simulator.recent_events[:limit]

@app.get("/api/logs/suspicious")
def get_suspicious_logs(limit: int = 200):
    """Returns recent events flagged as suspicious/highlighted."""
    return [ev for ev in simulator.recent_events if ev.highlighted][:limit]

@app.get("/api/logs/blocked")
def get_blocked_logs(limit: int = 200):
    """Returns all events blocked by simulated containment."""
    if simulator.blocked_events:
        return simulator.blocked_events[:limit]
    return [ev for ev in simulator.recent_events if "BLOCKED" in (ev.status or "")][:limit]

@app.get("/api/threats/summary")
def get_threats_summary():
    """Aggregates active threats grouped by target vector and IP."""
    threats_by_ip = {}
    for inc in rules_engine.incidents.values():
        ip = inc.source_ip
        if not ip or ip == "internal_config":
            continue
        is_blocked, _ = containment_service.is_blocked(ip=ip)
        if ip not in threats_by_ip:
            threats_by_ip[ip] = {
                "source_ip": ip,
                "threat_level": inc.severity,
                "threat_score": inc.rule_score,
                "event_count": inc.event_count,
                "systems_targeted": [inc.system],
                "rules_triggered": [inc.rule_code],
                "first_seen": inc.first_seen,
                "last_seen": inc.last_seen,
                "status": "CONTAINED" if (is_blocked or inc.containment_status != "none") else "ACTIVE",
                "actors": [inc.actor],
                "containment_type": "ip" if is_blocked else None
            }
        else:
            t = threats_by_ip[ip]
            t["event_count"] += inc.event_count
            if inc.rule_score > t["threat_score"]:
                t["threat_score"] = inc.rule_score
                t["threat_level"] = inc.severity
            if inc.system not in t["systems_targeted"]:
                t["systems_targeted"].append(inc.system)
            if inc.rule_code not in t["rules_triggered"]:
                t["rules_triggered"].append(inc.rule_code)
            if inc.actor not in t["actors"]:
                t["actors"].append(inc.actor)
            if inc.last_seen > t["last_seen"]:
                t["last_seen"] = inc.last_seen
            if is_blocked or inc.containment_status != "none":
                t["status"] = "CONTAINED"
    return list(threats_by_ip.values())

@app.get("/api/containment/blocked_ips")
def get_blocked_ips():
    return containment_service.get_blocked_targets()

@app.get("/api/time_buckets")
def get_time_buckets():
    return simulator.get_time_ip_buckets()

@app.get("/api/incidents")
def get_incidents():
    return list(rules_engine.incidents.values())

@app.patch("/api/incidents/{incident_id}")
def update_incident_status(incident_id: str, payload: Dict[str, Any]):
    inc = next((i for i in rules_engine.incidents.values() if i.id == incident_id), None)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    if "status" in payload:
        inc.status = payload["status"]
    if "assigned_to" in payload:
        inc.assigned_to = payload["assigned_to"]
    return inc

@app.post("/api/incidents/bulk_action")
async def bulk_incident_action(payload: Dict[str, str]):
    action = payload.get("action", "")
    operator = payload.get("operator", "secops_lead")
    count = 0
    for inc in rules_engine.incidents.values():
        if action == "acknowledge_all":
            inc.status = "acknowledged"
            count += 1
        elif action == "assign_secops":
            inc.status = "investigating"
            inc.assigned_to = operator
            count += 1
        elif action == "resolve_all":
            inc.status = "resolved"
            count += 1
    await simulator.broadcast_state()
    return {"status": "success", "action": action, "updated_count": count}

@app.post("/api/vendor_approval/resolve")
async def resolve_vendor_approval(payload: Dict[str, str]):
    action = payload.get("action", "dual_approve")
    if action == "dual_approve":
        # Clear pending approvals count and resolve RULE-BNK-007 incident
        metrics_collector.pending_bank_approvals_count = max(0, metrics_collector.pending_bank_approvals_count - 1)
        for inc in rules_engine.incidents.values():
            if "BNK" in inc.rule_code:
                inc.status = "resolved"
                inc.explanation += " [Dual-approval APR-2026-991 validated by Finance Director]."
        # Also log audit note
        await simulator.broadcast_state()
        return {"status": "approved", "approval_ref": "APR-2026-991", "message": "Dual-control confirmation recorded"}
    elif action == "freeze_vendor":
        req = ContainmentRequest(
            incident_id="bank-freeze-direct",
            target_type="api_key",
            target_value="key-tb-07",
            action_type="revoke",
            reason="Emergency vendor master freeze following unapproved bank detail alteration attempt",
            operator="compliance_director"
        )
        audit_entry = containment_service.execute_containment(req)
        await simulator.broadcast_state()
        return {"status": "frozen", "audit": audit_entry}
    return {"status": "ignored"}

@app.post("/api/containment/bulk_rollback")
async def bulk_rollback_containment():
    rolled_back_count = 0
    active_records = [r for r in containment_service.audit_log if r.status == "SIMULATED_ACTIVE"]
    for record in active_records:
        containment_service.rollback_containment(record.id, "secops_analyst")
        rolled_back_count += 1
    await simulator.broadcast_state()
    return {"status": "completed", "rolled_back_count": rolled_back_count}

@app.post("/api/simulation/burst")
async def inject_burst(payload: Dict[str, Any] = None):
    """Injects a rapid batch of synthetic events to visibly exercise meters and fluctuation."""
    count = payload.get("count", 6) if payload else 6
    for _ in range(count):
        ev = simulator.generate_continuous_fluctuating_event()
        alert = rules_engine.process_event(ev)
        metrics_collector.record_event(ev, latency_ms=4.8)
        await simulator.broadcast_event(ev, alert)
    return {"status": "burst_injected", "events_count": count}

@app.post("/api/simulation/control")
async def control_simulation(ctrl: SimulationControl):
    simulator.set_control(
        action=ctrl.action,
        speed=ctrl.speed,
        mode=ctrl.mode,
        scenario=ctrl.scenario
    )
    await simulator.broadcast_state()
    return {
        "status": "updated",
        "simulation_state": simulator.state,
        "mode": simulator.mode,
        "speed": simulator.speed,
        "active_scenario": simulator.active_scenario,
        "auto_block_enabled": simulator.auto_block_enabled
    }

@app.post("/api/containment/execute")
async def execute_containment(req: ContainmentRequest):
    """Executes a simulated quarantine or block action, updating simulation state and audit log."""
    audit_entry = containment_service.execute_containment(req)
    # Update related incident containment_status
    for inc in rules_engine.incidents.values():
        if inc.id == req.incident_id or inc.source_ip == req.target_value or inc.actor == req.target_value:
            inc.containment_status = "simulated_contained"
            inc.status = "contained"

    await simulator.broadcast_state()
    return audit_entry

@app.post("/api/containment/rollback")
async def rollback_containment(req: RollbackRequest):
    """Rolls back simulated quarantine or block action."""
    rolled_back = containment_service.rollback_containment(req.audit_id, req.operator)
    if not rolled_back:
        raise HTTPException(status_code=404, detail="Containment audit record not found or already rolled back")
    await simulator.broadcast_state()
    return rolled_back

@app.get("/api/containment/audit")
def get_containment_audit():
    return containment_service.get_audit_trail()

@app.get("/api/case/analysis")
def get_case_analysis():
    """Returns verified facts, inferences, and unresolved questions for CR-26-047."""
    return CASE_ANALYSIS_DATA

@app.get("/api/case/vendor_changes")
def get_vendor_changes(limit: int = 50):
    return evidence_loader.vendor_changes[:limit]

@app.get("/api/case/connected_software")
def get_connected_software():
    return evidence_loader.connected_software
