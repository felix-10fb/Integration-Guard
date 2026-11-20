import os
import io
import csv
import json
import zipfile
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from .config import ZIP_EVIDENCE_PATH, MAX_ARCHIVE_FILE_SIZE, ALLOWED_EVIDENCE_EXTENSIONS

# Standard IST offset (UTC+5:30) for Harbor & Finch Freight (Chennai, India tenant)
IST_OFFSET = timedelta(hours=5, minutes=30)

def sanitize_string(val: Any) -> str:
    """Sanitize string values to prevent injection and strip non-printable characters."""
    if val is None:
        return ""
    s = str(val).strip()
    return "".join(c for c in s if c.isprintable())

def parse_e02_local_ts(ts_local_str: str) -> tuple[str, str]:
    """
    Parse E02 HelpDeskr audit log local timestamp 'DD/MM/YYYY HH:MM:SS'
    Converts to normalized UTC ISO-8601 while preserving the original local IST time.
    """
    ts_clean = ts_local_str.strip()
    try:
        dt_local = datetime.strptime(ts_clean, "%d/%m/%Y %H:%M:%S")
        dt_utc = dt_local - IST_OFFSET
        utc_str = dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        local_str = dt_local.strftime("%Y-%m-%d %H:%M:%S IST")
        return utc_str, local_str
    except Exception:
        # Fallback if malformed
        return ts_clean, ts_clean

def parse_utc_ts(ts_utc_str: str) -> tuple[str, str]:
    """
    Parse standard UTC ISO string (e.g. '2026-06-03T00:31:22Z' or '2026-06-01T02:30:21+00:00')
    Returns normalized UTC ISO and tenant-local IST representation.
    """
    ts_clean = ts_utc_str.strip().replace("+00:00", "Z")
    try:
        if ts_clean.endswith("Z"):
            dt_utc = datetime.strptime(ts_clean, "%Y-%m-%dT%H:%M:%SZ")
        else:
            dt_utc = datetime.fromisoformat(ts_clean)
        utc_str = dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        dt_local = dt_utc + IST_OFFSET
        local_str = dt_local.strftime("%Y-%m-%d %H:%M:%S IST")
        return utc_str, local_str
    except Exception:
        return ts_clean, ts_clean

class EvidenceLoader:
    def __init__(self, zip_path: str = ZIP_EVIDENCE_PATH):
        self.zip_path = zip_path
        self._cached_events: List[Dict[str, Any]] = []
        self._connected_software: List[Dict[str, Any]] = []
        self._indicators: List[Dict[str, Any]] = []
        self._vendor_changes: List[Dict[str, Any]] = []

    def get_archive_manifest(self) -> List[Dict[str, Any]]:
        """Safely inspects archive contents without extraction or code execution."""
        if not os.path.exists(self.zip_path):
            return []
        
        manifest = []
        with zipfile.ZipFile(self.zip_path, "r") as z:
            for info in z.infolist():
                name = os.path.basename(info.filename)
                manifest.append({
                    "filename": name,
                    "uncompressed_bytes": info.file_size,
                    "is_dir": info.is_dir(),
                    "date_time": f"{info.date_time[0]:04d}-{info.date_time[1]:02d}-{info.date_time[2]:02d} {info.date_time[3]:02d}:{info.date_time[4]:02d}:{info.date_time[5]:02d}"
                })
        return manifest

    def load_case_evidence(self) -> Dict[str, Any]:
        """Loads and normalizes key evidence files safely into memory."""
        if not os.path.exists(self.zip_path):
            raise FileNotFoundError(f"Case evidence archive not found at {self.zip_path}")

        events: List[Dict[str, Any]] = []

        with zipfile.ZipFile(self.zip_path, "r") as z:
            # 1. Parse E04 Connected Software Register
            if "E04_connected_software_register.json" in z.namelist():
                with z.open("E04_connected_software_register.json") as f:
                    data = json.load(f)
                    self._connected_software = data.get("integrations", [])

            # 2. Parse E17 Indicator List
            if "E17_indicator_list.csv" in z.namelist():
                with z.open("E17_indicator_list.csv") as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    self._indicators = [
                        {k: sanitize_string(v) for k, v in row.items()}
                        for row in reader
                    ]

            # 3. Parse E19 Vendor Master Change Log (especially unapproved bank changes)
            if "E19_vendor_master_change_log.csv" in z.namelist():
                with z.open("E19_vendor_master_change_log.csv") as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    for row in reader:
                        utc_ts, local_ts = parse_utc_ts(row["ts_utc"])
                        change_item = {
                            "id": f"e19-{row['change_id']}",
                            "ts_utc": utc_ts,
                            "ts_local": local_ts,
                            "system": "LedgerOne",
                            "source_ip": sanitize_string(row.get("source_ip", "")),
                            "actor": sanitize_string(row.get("changed_by", "")),
                            "actor_type": "integration" if "tb" in row.get("changed_by", "") else "user",
                            "action": f"vendor.change.{row.get('field', '')}",
                            "endpoint": "/v2/vendors/change",
                            "method": "PATCH",
                            "records_returned": 1,
                            "status": "ok",
                            "details": f"Vendor {row.get('vendor_name')} ({row.get('vendor_id')}): {row.get('field')} changed from {row.get('old_value')} to {row.get('new_value')}. Approval: '{row.get('approval_ref')}'. Channel: {row.get('channel')}",
                            "is_replayed": True,
                            "evidence_id": "E19",
                            "highlighted": (row.get("field") == "bank_account" and not row.get("approval_ref")),
                            "metadata": {
                                "vendor_id": row.get("vendor_id"),
                                "vendor_name": row.get("vendor_name"),
                                "field": row.get("field"),
                                "approval_ref": row.get("approval_ref"),
                                "channel": row.get("channel"),
                                "change_id": row.get("change_id")
                            }
                        }
                        self._vendor_changes.append(change_item)
                        # We also register it as an event for replay
                        events.append(change_item)

            # 4. Parse E01 & E18 LedgerOne API Access (focused on suspicious and sample events)
            for file_name, ev_id in [("E01_ledgerone_api_access.csv", "E01"), ("E18_ledgerone_api_access_1_to_7_sep.csv", "E18")]:
                if file_name in z.namelist():
                    with z.open(file_name) as f:
                        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                        for row in reader:
                            # Prioritize all suspicious indicator rows and representative routine sync rows
                            ip = row.get("caller_ip", "")
                            key = row.get("api_key_id", "")
                            endpoint = row.get("endpoint", "")
                            ua = row.get("user_agent", "")
                            is_suspicious = (
                                ip in ["198.18.7.41", "198.18.7.58", "198.18.8.6"] or
                                key in ["key-tb-03"] or
                                "export" in endpoint.lower() or
                                "payments/search" in endpoint.lower() or
                                "3.4.1" in ua or
                                "requests" in ua.lower()
                            )
                            # Keep suspicious events and a representative baseline sample for demo responsiveness
                            if is_suspicious or (row["ts_utc"].startswith("2026-08-1") and "POST" in row.get("method", "")):
                                utc_ts, local_ts = parse_utc_ts(row["ts_utc"])
                                events.append({
                                    "id": f"{ev_id.lower()}-{row['request_id']}",
                                    "ts_utc": utc_ts,
                                    "ts_local": local_ts,
                                    "system": "LedgerOne",
                                    "source_ip": sanitize_string(ip),
                                    "actor": sanitize_string(key),
                                    "actor_type": "integration" if key.startswith("key-") else "user",
                                    "action": f"api.{row.get('method', 'GET').lower()}",
                                    "endpoint": sanitize_string(endpoint),
                                    "method": sanitize_string(row.get("method", "GET")),
                                    "records_returned": int(row.get("records_returned", 0)),
                                    "status": sanitize_string(row.get("status", "200")),
                                    "details": f"User-Agent: {ua}",
                                    "is_replayed": True,
                                    "evidence_id": ev_id,
                                    "highlighted": is_suspicious,
                                    "metadata": {"user_agent": ua, "request_id": row.get("request_id")}
                                })

            # 5. Parse E02 HelpDeskr Audit Log (Correctly convert local IST to UTC)
            if "E02_helpdeskr_audit_log.csv" in z.namelist():
                with z.open("E02_helpdeskr_audit_log.csv") as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    for row in reader:
                        action = row.get("action", "")
                        ip = row.get("source_ip", "")
                        actor = row.get("actor", "")
                        is_suspicious = (
                            "export" in action.lower() or
                            ip in ["198.18.7.41", "198.18.7.58", "198.18.8.6"]
                        )
                        # Keep all export operations and suspicious IP hits
                        if is_suspicious:
                            utc_ts, local_ts = parse_e02_local_ts(row["ts_local"])
                            events.append({
                                "id": f"e02-{row['event_id']}",
                                "ts_utc": utc_ts,
                                "ts_local": local_ts,
                                "system": "HelpDeskr",
                                "source_ip": sanitize_string(ip),
                                "actor": sanitize_string(actor),
                                "actor_type": sanitize_string(row.get("actor_type", "integration")),
                                "action": sanitize_string(action),
                                "endpoint": f"/helpdesk/objects/{row.get('object_id', '')}",
                                "method": "POST" if "create" in action else ("DELETE" if "delete" in action else "GET"),
                                "records_returned": 1000 if "export" in action else 1,
                                "status": sanitize_string(row.get("result", "ok")),
                                "details": sanitize_string(row.get("details", "")),
                                "is_replayed": True,
                                "evidence_id": "E02",
                                "highlighted": is_suspicious,
                                "metadata": {
                                    "object_id": row.get("object_id"),
                                    "original_local_ts": row.get("ts_local"),
                                    "tenant_tz": "IST (UTC+05:30)"
                                }
                            })

            # 6. Parse E03 SSO Sign-in Log
            if "E03_sso_signin_log.csv" in z.namelist():
                with z.open("E03_sso_signin_log.csv") as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8"))
                    for row in reader:
                        ip = row.get("source_ip", "")
                        res = row.get("result", "")
                        user = row.get("user", "")
                        is_suspicious = (
                            ip in ["198.18.7.41", "198.18.7.58", "198.18.7.77"] or
                            (res == "failure" and user == "a.kapoor")
                        )
                        if is_suspicious:
                            utc_ts, local_ts = parse_utc_ts(row["ts_utc"])
                            events.append({
                                "id": f"e03-{row['event_id']}",
                                "ts_utc": utc_ts,
                                "ts_local": local_ts,
                                "system": "SSO",
                                "source_ip": sanitize_string(ip),
                                "actor": sanitize_string(user),
                                "actor_type": "user",
                                "action": "auth.signin",
                                "endpoint": "/sso/login",
                                "method": "POST",
                                "records_returned": 1,
                                "status": sanitize_string(res),
                                "details": f"City: {row.get('city')}, Method: {row.get('auth_method')}, MFA: {row.get('mfa_result')}, Reason: {row.get('failure_reason')}",
                                "is_replayed": True,
                                "evidence_id": "E03",
                                "highlighted": is_suspicious,
                                "metadata": {
                                    "mfa_result": row.get("mfa_result"),
                                    "failure_reason": row.get("failure_reason"),
                                    "city": row.get("city")
                                }
                            })

        # Sort all replayed events chronologically by normalized UTC timestamp
        events.sort(key=lambda x: x["ts_utc"])
        self._cached_events = events

        return {
            "total_replayed_events": len(events),
            "connected_software_count": len(self._connected_software),
            "indicators_count": len(self._indicators),
            "vendor_changes_count": len(self._vendor_changes)
        }

    @property
    def replayed_events(self) -> List[Dict[str, Any]]:
        if not self._cached_events:
            self.load_case_evidence()
        return self._cached_events

    @property
    def connected_software(self) -> List[Dict[str, Any]]:
        if not self._connected_software:
            self.load_case_evidence()
        return self._connected_software

    @property
    def indicators(self) -> List[Dict[str, Any]]:
        if not self._indicators:
            self.load_case_evidence()
        return self._indicators

    @property
    def vendor_changes(self) -> List[Dict[str, Any]]:
        if not self._vendor_changes:
            self.load_case_evidence()
        return self._vendor_changes

# Singleton instance
evidence_loader = EvidenceLoader()
