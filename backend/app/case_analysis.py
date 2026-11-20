from typing import Dict, Any, List

CASE_ANALYSIS_DATA: Dict[str, Any] = {
    "case_id": "CR-26-047",
    "target_organization": "Harbor & Finch Freight Pvt. Ltd. (Chennai, India)",
    "investigated_entity": "TallyBridge Software / TallyBridge Connect Integration",
    "verified_facts": [
        {
            "id": "VF-01",
            "title": "Unrestricted All-Modules Credential Architecture",
            "evidence_id": "E04, E07, E10",
            "verified": True,
            "description": (
                "Credential 'key-tb-07' was provisioned on LedgerOne with 'read:write all-modules' scope, "
                "no IP restriction (ip_restriction=false), and no token expiry (token_lifetime_days=null). "
                "Annual review was due June 2025 but never performed. Violates IT Policy TPS-POL-02."
            )
        },
        {
            "id": "VF-02",
            "title": "LedgerOne Financial Data Exfiltration & Endpoint Probing",
            "evidence_id": "E01, E17",
            "verified": True,
            "description": (
                "On 2026-08-09 (03:12–03:44 UTC) and 2026-08-12 (03:41–04:02 UTC), credential 'key-tb-07' was invoked "
                "from external IPs 198.18.7.41 and 198.18.7.58. The actor probed schema endpoints, initiated two vendor bulk exports "
                "(9,840 and 9,835 records downloaded), and executed repeated /v2/payments/search queries."
            )
        },
        {
            "id": "VF-03",
            "title": "HelpDeskr Ticket Export Burst & Deletion to Evade Retention",
            "evidence_id": "E02, E06, E13",
            "verified": True,
            "description": (
                "Between 23:30 IST on 11 Aug and 00:33 IST on 12 Aug (18:00–19:03 UTC), integration actor 'tb-sync-svc' "
                "generated 10 rapid bulk ticket exports (EXP-5410 to EXP-5419) from 198.18.7.41 and 198.18.7.58. "
                "Each job was downloaded and immediately deleted. The final deletion timed out, generating an overage invoice (E06)."
            )
        },
        {
            "id": "VF-04",
            "title": "Unapproved Vendor Bank Account Alteration via Integration Key",
            "evidence_id": "E19",
            "verified": True,
            "description": (
                "On 2026-09-03 at 01:44:30 UTC, 'key-tb-07' submitted an API patch (chg-8b9888c39b) modifying the bank account "
                "for Coastal Packaging Ltd (V-0412) from '****4417' to '****9083' with a blank approval reference (approval_ref = ''). "
                "This bypasses normal finance dual-control approval."
            )
        },
        {
            "id": "VF-05",
            "title": "Outdated Client Version & Scripted Tooling",
            "evidence_id": "E01, E17, E20",
            "verified": True,
            "description": (
                "Unauthorised requests used retired user-agent 'TallyBridge-Sync/3.4.1' (retired 10 July 2026 in favor of 3.5.0) "
                "and scripted client 'python-requests/2.31.0'. Legitimate production syncs had transitioned to 3.5.0."
            )
        }
    ],
    "inferences": [
        {
            "id": "INF-01",
            "title": "TallyBridge Vendor Notices Contain False / Incomplete Claims",
            "evidence_id": "E01 vs E12/E16",
            "verified": False,
            "status": "Inference (Contradicted by Technical Evidence)",
            "description": (
                "TallyBridge's notice to Harbor & Finch (E16) asserted: 'Access was limited to support ticket metadata; "
                "no evidence finance records were accessed' and activity occurred 'on 11 and 12 August only.' "
                "LedgerOne access logs (E01) directly refute both assertions: reconnaissance occurred on 9 August, "
                "and over 19,000 vendor and payment records were queried and downloaded."
            )
        },
        {
            "id": "INF-02",
            "title": "Staged Attack Lifecycle: Reconnaissance -> Exfiltration -> Exploitation",
            "evidence_id": "E01, E02, E19",
            "verified": False,
            "status": "Inference (Strong Technical Deductions)",
            "description": (
                "The timeline indicates a deliberate 3-stage operation: (1) Reconnaissance on 9 Aug mapping financial endpoints; "
                "(2) Mass exfiltration on 11–12 Aug of ticketing data and vendor/payment registers; "
                "(3) Exploitation on 3 Sep attempting payment diversion via Coastal Packaging Ltd bank update."
            )
        },
        {
            "id": "INF-03",
            "title": "Covert Exfiltration via Anti-Forensic Deletions",
            "evidence_id": "E02, E10",
            "verified": False,
            "status": "Inference",
            "description": (
                "The systematic deletion of export files within 120 seconds of download in HelpDeskr was designed to minimize "
                "on-disk footprint and circumvent retrospective discovery, failing only because HelpDeskr billing counts jobs at creation."
            )
        }
    ],
    "unresolved_questions": [
        {
            "id": "UQ-01",
            "title": "No Substantiated Evidence Attributing Activity to Rohan Menon",
            "evidence_id": "E13, E14, E03",
            "verified": False,
            "status": "Unverified / Speculative Claim",
            "description": (
                "Support chat (E13) noted that former employee Rohan Menon's warehouse kiosk login was still active past his 30 June exit. "
                "However, there is ZERO log evidence connecting Rohan Menon's account or kiosk terminal to the external IP traffic, "
                "TallyBridge API keys, or vendor master changes. Rebutted as unsubstantiated correlation."
            )
        },
        {
            "id": "UQ-02",
            "title": "Dynamic Broadband IP Reassignment (Chennai Subnet 198.18.7.0/24)",
            "evidence_id": "E03, E20",
            "verified": False,
            "status": "Unresolved Forensic Ambiguity",
            "description": (
                "Staff member j.kulkarni authenticated from IP 198.18.7.58 in July. Public telecom records (E20) demonstrate that "
                "SouthNet Broadband uses dynamic DHCP pools across Chennai, reassigning IPs among thousands of residential and "
                "commercial subscribers. Conflating the August attacker IP with July staff sessions is scientifically invalid."
            )
        },
        {
            "id": "UQ-03",
            "title": "Precise Initial Compromise Vector at TallyBridge",
            "evidence_id": "E07, E20",
            "verified": False,
            "status": "Unresolved External Vector",
            "description": (
                "Job postings (E20) revealed TallyBridge lacked secrets scanning in build pipelines and re-provisioned build host tb-build-02. "
                "However, without third-party vendor internal telemetry (strictly excluded from Harbor & Finch contract E08), "
                "the exact mechanism by which key-tb-07 leaked remains formally unverified."
            )
        }
    ],
    "vendor_notice_assessment": {
        "vendor_claim_1": "Unauthorised requests on 11 and 12 August only.",
        "log_reality_1": "DISPROVED: Telemetry in E01 confirms unauthorized probing began on 2026-08-09T03:12:00Z.",
        "vendor_claim_2": "Access was limited to support ticket metadata; no finance records accessed.",
        "log_reality_2": "DISPROVED: E01 records prove 9,840 + 9,835 vendor records downloaded and payment searches queried.",
        "vendor_claim_3": "Activity originated entirely outside vendor network.",
        "log_reality_3": "UNVERIFIED: Attack used external IPs (198.18.7.x), but compromise of vendor key storage cannot be ruled out."
    }
}
