import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.evidence_loader import evidence_loader
from backend.app.rules_engine import rules_engine
from backend.app.containment import containment_service
from backend.app.models import SecurityEvent, ContainmentRequest, RollbackRequest
from backend.app.metrics import metrics_collector

def test_evidence_loader_and_timezone_normalization():
    res = evidence_loader.load_case_evidence()
    assert res["total_replayed_events"] > 0
    assert res["connected_software_count"] > 0

    # Verify E02 local IST to UTC normalization
    e02_events = [e for e in evidence_loader.replayed_events if e["evidence_id"] == "E02"]
    assert len(e02_events) > 0
    sample_e02 = e02_events[0]
    assert sample_e02["metadata"]["tenant_tz"] == "IST (UTC+05:30)"
    assert "Z" in sample_e02["ts_utc"]

    # Verify E19 Coastal Packaging bank change exists
    coastal_changes = [
        c for c in evidence_loader.vendor_changes
        if "coastal" in c["details"].lower() or c["metadata"].get("vendor_id") == "V-0412"
    ]
    assert len(coastal_changes) == 1
    assert coastal_changes[0]["highlighted"] is True
    assert coastal_changes[0]["metadata"]["approval_ref"] == ""
    print("[PASS] Evidence loader and timezone normalization test passed.")

def test_rule_detection_and_deduplication():
    rules_engine.reset()

    # Test Rule 7: Unapproved vendor bank update
    ev_bank = SecurityEvent(
        id="test-bank-1",
        ts_utc="2026-09-03T01:44:30Z",
        ts_local="2026-09-03 07:14:30 IST",
        system="LedgerOne",
        source_ip="10.20.4.77",
        actor="key-tb-07",
        actor_type="integration",
        action="vendor.change.bank_account",
        records_returned=1,
        status="ok",
        is_replayed=True,
        evidence_id="E19",
        metadata={"vendor_id": "V-0412", "vendor_name": "Coastal Packaging Ltd", "approval_ref": ""}
    )
    alert = rules_engine.process_event(ev_bank)
    assert alert is not None
    assert alert.rule_code == "RULE-BNK-007"
    assert alert.severity == "critical"
    assert alert.rule_score == 99

    # Test Deduplication: sending identical event should increment count without creating duplicate incident
    alert2 = rules_engine.process_event(ev_bank)
    assert alert2.id == alert.id
    assert alert2.event_count == 2

    # Test Rule 1: Out-of-range integration IP
    ev_ip = SecurityEvent(
        id="test-ip-1",
        ts_utc="2026-08-09T03:12:00Z",
        ts_local="2026-08-09 08:42:00 IST",
        system="LedgerOne",
        source_ip="198.18.7.41",
        actor="key-tb-07",
        actor_type="integration",
        action="api.get",
        records_returned=1,
        status="200"
    )
    alert_ip = rules_engine.process_event(ev_ip)
    assert alert_ip is not None
    assert alert_ip.rule_code == "RULE-INT-001"
    assert alert_ip.severity == "critical"

    # Test Rule 4: Export burst create-download-delete sequence
    ev_exp1 = SecurityEvent(id="e-1", ts_utc="2026-08-11T18:00:10Z", ts_local="", system="HelpDeskr",
                            source_ip="198.18.7.41", actor="tb-sync-svc", actor_type="integration",
                            action="export.create", records_returned=1000, status="ok")
    ev_exp2 = SecurityEvent(id="e-2", ts_utc="2026-08-11T18:02:10Z", ts_local="", system="HelpDeskr",
                            source_ip="198.18.7.41", actor="tb-sync-svc", actor_type="integration",
                            action="export.download", records_returned=1000, status="ok")
    ev_exp3 = SecurityEvent(id="e-3", ts_utc="2026-08-11T18:04:10Z", ts_local="", system="HelpDeskr",
                            source_ip="198.18.7.41", actor="tb-sync-svc", actor_type="integration",
                            action="export.delete", records_returned=0, status="ok")
    rules_engine.process_event(ev_exp1)
    rules_engine.process_event(ev_exp2)
    alert_exp = rules_engine.process_event(ev_exp3)
    assert alert_exp is not None
    # Both RULE-EXP-004 and correlated campaign RULE-CORR-006 should be registered
    assert "RULE-EXP-004:tb-sync-svc:198.18.7.41" in rules_engine.incidents
    assert alert_exp.rule_code in ("RULE-EXP-004", "RULE-CORR-006")
    assert alert_exp.severity == "critical"

    print("[PASS] Rule detection and deduplication test passed.")

def test_simulated_containment_and_rollback():
    containment_service.reset()

    # 1. Execute simulated quarantine on IP
    req = ContainmentRequest(
        incident_id="inc-test-01",
        target_type="ip",
        target_value="198.18.7.41",
        action_type="quarantine",
        reason="Repeated unauthorized bulk exports and reconnaissance"
    )
    audit = containment_service.execute_containment(req)
    assert audit.status == "SIMULATED_ACTIVE"
    assert audit.notice == "SIMULATED — no real system changed."
    assert containment_service.is_blocked(ip="198.18.7.41")[0] is True

    # 2. Execute simulated revocation on API Key
    req_key = ContainmentRequest(
        incident_id="inc-test-02",
        target_type="api_key",
        target_value="key-tb-07",
        action_type="quarantine",
        reason="Compromised credential invoked from unauthorized IP"
    )
    audit_key = containment_service.execute_containment(req_key)
    assert containment_service.is_blocked(actor="key-tb-07")[0] is True
    assert containment_service.get_active_blocks_count() == 2

    # 3. Rollback containment action
    rb = containment_service.rollback_containment(audit.id, operator="secops_analyst")
    assert rb.status == "ROLLED_BACK"
    assert containment_service.is_blocked(ip="198.18.7.41")[0] is False
    assert containment_service.is_blocked(actor="key-tb-07")[0] is True

    print("[PASS] Simulated containment and rollback test passed.")

def test_metrics_and_gauges():
    metrics_collector.reset()
    ev = SecurityEvent(id="e-test", ts_utc="2026-09-01T00:00:00Z", ts_local="", system="SSO",
                       source_ip="172.16.8.20", actor="m.sundar", actor_type="user",
                       action="auth.signin", records_returned=1, status="success")
    metrics_collector.record_event(ev, latency_ms=4.5)
    metrics = metrics_collector.get_dashboard_metrics(
        open_incidents_count=1,
        open_incidents=[],
        simulation_state="running",
        simulation_mode="synthetic",
        current_speed=1.0
    )
    assert metrics.events_processed == 1
    assert metrics.latency_p50 > 0
    assert metrics.gauges.rule_risk >= 0
    assert metrics.gauges.sensor_health >= 90
    print("[PASS] Metrics and gauges calculation test passed.")

if __name__ == "__main__":
    test_evidence_loader_and_timezone_normalization()
    test_rule_detection_and_deduplication()
    test_simulated_containment_and_rollback()
    test_metrics_and_gauges()
    print("ALL INTEGRATION GUARD BACKEND VERIFICATION CHECKS PASSED SUCCESSFULLY!")
