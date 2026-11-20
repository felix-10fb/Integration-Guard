import time
import math
import random
from typing import List, Dict, Any, Optional
import numpy as np
from .models import SpeedometerGauges, DashboardMetrics
from .containment import containment_service

class MetricsCollector:
    def __init__(self):
        self.events_processed = 0
        self.distinct_ips: set[str] = set()
        self.export_jobs_count = 0
        self.records_returned_count = 0
        self.pending_bank_approvals_count = 0
        self.latencies_ms: List[float] = [3.8, 4.2, 4.1, 5.0, 3.9, 11.2, 12.5, 23.4]
        self.last_eps_calc_time = time.time()
        self.events_since_last_calc = 0
        self.current_eps = 0.8
        self._last_event_time = time.time()
        self.recent_suspicious_timestamps: List[float] = []

    def reset(self):
        self.events_processed = 0
        self.distinct_ips.clear()
        self.export_jobs_count = 0
        self.records_returned_count = 0
        self.pending_bank_approvals_count = 0
        self.latencies_ms = [3.8, 4.2, 4.1, 5.0, 3.9, 11.2, 12.5, 23.4]
        self.last_eps_calc_time = time.time()
        self.events_since_last_calc = 0
        self.current_eps = 0.8
        self._last_event_time = time.time()
        self.recent_suspicious_timestamps.clear()

    def record_event(self, event, latency_ms: float = 4.2):
        now = time.time()
        self.events_processed += 1
        self.events_since_last_calc += 1
        self._last_event_time = now

        if event.source_ip:
            self.distinct_ips.add(event.source_ip)
        if "export" in event.action.lower() or "export" in (event.endpoint or "").lower():
            self.export_jobs_count += 1
        if event.records_returned:
            self.records_returned_count += event.records_returned
        if "bank" in event.action.lower() and not event.metadata.get("approval_ref"):
            self.pending_bank_approvals_count += 1

        if event.highlighted:
            self.recent_suspicious_timestamps.append(now)

        # Retain only suspicious timestamps within the last 45 seconds for rolling recency
        self.recent_suspicious_timestamps = [t for t in self.recent_suspicious_timestamps if now - t <= 45.0]

        self.latencies_ms.append(latency_ms)
        if len(self.latencies_ms) > 200:
            self.latencies_ms.pop(0)

        elapsed = now - self.last_eps_calc_time
        if elapsed >= 0.8:
            raw_eps = self.events_since_last_calc / elapsed
            # Smooth EMA with organic micro-jitter (0.6 - 2.8 EPS range)
            jitter = random.uniform(-0.15, 0.15)
            self.current_eps = max(0.4, round(0.65 * self.current_eps + 0.35 * raw_eps + jitter, 1))
            self.events_since_last_calc = 0
            self.last_eps_calc_time = now

    def calculate_percentiles(self) -> tuple[float, float, float]:
        if not self.latencies_ms:
            return 4.2, 12.5, 24.0
        arr = sorted(self.latencies_ms)
        p50 = np.percentile(arr, 50)
        p95 = np.percentile(arr, 95)
        p99 = np.percentile(arr, 99)
        return round(float(p50), 1), round(float(p95), 1), round(float(p99), 1)

    def compute_gauges(self, open_incidents: list) -> SpeedometerGauges:
        """
        Computes dynamic, continuously fluctuating gauges reflecting real-time threat detection,
        attack intensity surges, and organic instrument vibration until paused/stopped.
        """
        now = time.time()
        active_blocks = containment_service.get_active_blocks_count()

        # Check recency and count of suspicious detections in rolling window
        recent_count = len(self.recent_suspicious_timestamps)
        latest_threat_age = (now - self.recent_suspicious_timestamps[-1]) if self.recent_suspicious_timestamps else 999.0

        # Organic breathing vibration (simulates high-frequency sensor noise)
        needle_vibe = math.sin(now * 3.8) * 1.8 + math.cos(now * 2.1) * 1.2

        # 1. Dynamic Rule Risk Score (Exponential threat decay curve + organic vibration)
        baseline_risk = 22.0 + math.sin(now * 1.5) * 4.0
        if latest_threat_age < 30.0:
            # Threat detected! Exponential decay with half-life ~4.5 seconds
            decay = math.exp(-latest_threat_age / 5.2)
            peak_threat = 92.0
            if active_blocks > 0:
                # Mitigated threat peak when containment blocks are active
                peak_threat = max(38.0, 92.0 - (active_blocks * 26.0))
            risk = baseline_risk + (peak_threat - baseline_risk) * decay + needle_vibe
        elif any(inc.rule_code.startswith("RULE-GOV") for inc in open_incidents):
            # Governance baseline warning: fluctuates 30-40%
            risk = 34.0 + needle_vibe * 1.5
        else:
            # Clean baseline operations: breathes gently between 16% and 26%
            risk = baseline_risk + needle_vibe

        risk = min(98.0, max(8.0, risk))

        # 2. Sensor & Source Health (0 to 100)
        # Floats naturally between 96.0% and 99.5% with realistic fluctuation
        health_vibe = math.cos(now * 1.8) * 0.9 + math.sin(now * 2.9) * 0.6
        sensor_health = 98.4 + health_vibe
        if latest_threat_age < 10.0:
            sensor_health -= min(5.0, 1.5 * recent_count)  # slight pressure drop under high load

        sensor_health = min(100.0, max(85.0, sensor_health))

        # 3. Integration Control Posture (0 to 100)
        # 42% initial baseline -> 68% on 1 block -> 88% on 2 blocks -> 95%+ on 3 blocks
        posture_base = min(96.0, 42.0 + (active_blocks * 24.0))
        posture_vibe = math.sin(now * 1.2) * 1.1 + math.cos(now * 0.9) * 0.5
        posture = min(100.0, max(20.0, posture_base + posture_vibe))

        return SpeedometerGauges(
            rule_risk=int(round(risk)),
            sensor_health=int(round(sensor_health)),
            control_posture=int(round(posture))
        )

    def get_dashboard_metrics(
        self,
        open_incidents_count: int,
        open_incidents: list,
        simulation_state: str,
        simulation_mode: str,
        current_speed: float,
        active_scenario: Optional[str] = None,
        auto_block_enabled: bool = False
    ) -> DashboardMetrics:
        p50, p95, p99 = self.calculate_percentiles()
        gauges = self.compute_gauges(open_incidents)

        return DashboardMetrics(
            live_badge="LIVE SIMULATION",
            heartbeat=True,
            events_processed=self.events_processed,
            eps=self.current_eps,
            open_alerts=open_incidents_count,
            distinct_ips=len(self.distinct_ips),
            export_jobs=self.export_jobs_count,
            records_returned=self.records_returned_count,
            pending_bank_approvals=self.pending_bank_approvals_count,
            simulated_blocks=containment_service.get_active_blocks_count(),
            latency_p50=p50,
            latency_p95=p95,
            latency_p99=p99,
            gauges=gauges,
            simulation_state=simulation_state,
            simulation_mode=simulation_mode,
            current_speed=current_speed,
            active_scenario=active_scenario,
            auto_block_enabled=auto_block_enabled
        )

metrics_collector = MetricsCollector()
