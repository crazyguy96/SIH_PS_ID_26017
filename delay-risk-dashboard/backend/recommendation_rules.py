"""
SIH PS 26017: Auditable Rule-Based Intervention Engine
Maps top contributing delay drivers to actionable policy & operational interventions.
Transparent, auditable, and deterministic (no black-box LLM hallucinations).
"""

RECOMMENDATION_RULES = {
    "legal_dispute": [
        "Escalate pending legal matters to State Legal Cell for expedited hearing / resolution",
        "Track court injunctions and high court case milestones via National Judicial Data Grid",
    ],
    "kw_court_litigation": [
        "Engage Additional Solicitor General / State Counsel for vacation of stay orders",
        "Schedule bi-weekly status review with Project Legal Taskforce",
    ],
    "rr_issue": [
        "Review Rehabilitation & Resettlement (R&R) package disbursal with District Collector",
        "Fast-track alternative site possession and civic infrastructure handover for project-affected families",
    ],
    "kw_rr_resettlement": [
        "Audit resettlement site readiness and compensation disbursal to PAPs (Project Affected Persons)",
        "Hold structured district grievance redressal camps for rehabilitation disputes",
    ],
    "row_issue": [
        "Convene inter-agency taskforce to clear Right-of-Way (RoW) utility encumbrances",
        "Expedite joint site inspection with municipal and local authority bodies",
    ],
    "kw_row_utility_shift": [
        "Coordinate with State Electricity Board and Jal Sansthan for priority utility shifting",
        "Authorize deposit work payments to accelerate transmission line/pipeline relocation",
    ],
    "administrative_issue": [
        "Flag bottleneck to Nodal Officer / MoRD Project Monitoring Group (PMG)",
        "Schedule urgent Secretary-level review meeting to clear inter-departmental logjam",
    ],
    "kw_admin_approval_delay": [
        "Track pending G.O. (Government Order) / administrative sanction on PMG portal",
        "Assign single-window nodal escort officer to expedite pending approvals",
    ],
    "forest_land_or_clearance_issue": [
        "Expedite Stage-I/Stage-II Forest Clearance through MoEF&CC PARIVESH portal",
        "Identify non-forest land for Compensatory Afforestation (CA) with State Forest Dept",
    ],
    "kw_forest_clearance": [
        "Follow up with State Principal Chief Conservator of Forests (PCCF) for pending clearance",
        "Ensure prompt deposit of Net Present Value (NPV) and CA funds into CAMPA account",
    ],
    "kw_environment_clearance": [
        "Submit compliance report to State Environmental Impact Assessment Authority (SEIAA)",
        "Coordinate public hearing documentation with State Pollution Control Board",
    ],
    "compensation_mentioned": [
        "Review land award determinations under RFCTLARR Act 2013 with Special Land Acquisition Officer (SLAO)",
        "Release pending compensation escrow funds to direct-benefit beneficiary bank accounts",
    ],
    "kw_compensation_dispute": [
        "Convene compensation dispute settlement lok adalat at district level",
        "Verify beneficiary land record mutations and expedite title settlement",
    ],
    "land_gap_ha_calc": [
        "Prioritize critical path land parcels to eliminate acute land acquisition gap",
        "Deploy dedicated land acquisition survey teams for unacquired acreage",
    ],
    "land_acquisition_pct": [
        "Intensify section 11 & section 19 notifications under RFCTLARR Act",
        "Conduct joint verification of land boundary surveys with state revenue officials",
    ],
    "land_possession_pct_calc": [
        "Accelerate physical possession handover for already acquired land parcels",
        "Coordinate with district police administration for boundary demarcation and protection",
    ],
    "physical_progress_pct": [
        "Issue corrective notice and demand revised catch-up schedule from EPC contractor",
        "Conduct critical-path CPM/PERT milestone audit of stalled construction packages",
    ],
    "cost_overrun_pct_calc_clean": [
        "Submit Revised Cost Estimate (RCE) to Expenditure Finance Committee (EFC)",
        "Audit price escalation clauses and optimize value engineering across remaining works",
    ],
    "kw_contractor_agency": [
        "Invoke contractual cure notice under GCC for milestone non-compliance",
        "Evaluate contractor cash flow constraints or initiate partial de-scoping",
    ],
    "kw_equipment_supply": [
        "Audit critical equipment vendor manufacturing milestones and supply chain delays",
        "Authorize alternative approved vendors or expedite factory acceptance testing",
    ],
    "kw_funding_financial": [
        "Coordinate prompt release of central/state budget tranches via PFMS",
        "Fast-track pending counterpart funding approvals from state finance department",
    ],
    "kw_monsoon_weather": [
        "Re-sequence outdoor earthwork and foundation schedules around wet season window",
        "Mobilize high-capacity dewatering equipment and pre-monsoon slope protection",
    ],
    "kw_geological_technical": [
        "Commission peer technical review by expert geotechnical institute",
        "Approve engineered ground improvement or slope stabilization design modifications",
    ],
    "kw_law_and_order": [
        "Engage Superintendent of Police for round-the-clock site security at sensitive stretches",
        "Organize community stakeholder consultations with local village panchayats",
    ],
    "kw_railway_line_issue": [
        "Coordinate with Railway Board / Zonal Railway for GAD (General Arrangement Drawing) approval",
        "Book requisite railway traffic/power blocks for bridge girder launching",
    ],
    "kw_defence_land": [
        "Submit requisition through Ministry of Defence Directorate General of Defence Estates (DGDE)",
        "Expedite equal-value land exchange proposal with Local Military Authority (LMA)",
    ],
    "project_age_months_at_report": [
        "Conduct comprehensive sunset review to re-baseline project milestones",
        "Resolve legacy contractual disputes through Project Dispute Resolution Mechanism",
    ],
    "state_freq_encoded": [
        "Benchmark project clearance velocity against top-performing states",
        "Escalate recurring inter-state or state-specific bottlenecks at Central PRAGATI forum",
    ],
}

FRIENDLY_FEATURE_NAMES = {
    "legal_dispute": "Legal / Court Dispute Pending",
    "rr_issue": "Rehabilitation & Resettlement (R&R) Bottleneck",
    "row_issue": "Right-of-Way (RoW) / Utility Obstruction",
    "administrative_issue": "Inter-Departmental Administrative Delay",
    "forest_land_or_clearance_issue": "Forest / Wildlife Land Clearance Pending",
    "compensation_mentioned": "Land Compensation Dispute / Disbursement Issue",
    "land_gap_ha_calc": "Significant Land Acquisition Gap (Hectares)",
    "land_acquisition_pct": "Low Cumulative Land Acquisition %",
    "land_possession_pct_calc": "Low Land Possession Handover %",
    "land_required_ha": "High Total Land Requirement",
    "land_acquired_ha": "Land Acquired Shortfall",
    "physical_progress_pct": "Physical Construction Progress Lag",
    "cost_overrun_pct_calc_clean": "High Cost Escalation %",
    "project_age_months_at_report": "Prolonged Project Duration / Stagnation",
    "original_cost_crore": "High Original Project Outlay",
    "anticipated_cost_crore_extracted": "Escalated Anticipated Cost",
    "state_freq_encoded": "Regional State Delay Frequency Pattern",
    "has_land_component_v2": "High Land Intensity Project",
    "num_issue_flags_v2": "Multiple Compounding Issues Concurrently Active",
    "narrative_issue_richness_score": "Dense Bottleneck Issues Reported in MOSPI Narrative",
    "kw_court_litigation": "Litigation / Stay Order Mentioned in MOSPI Report",
    "kw_forest_clearance": "Forest Clearance Mentioned in MOSPI Report",
    "kw_environment_clearance": "Environment Clearance Mentioned in MOSPI Report",
    "kw_rr_resettlement": "Resettlement Issues Mentioned in MOSPI Report",
    "kw_compensation_dispute": "Compensation Grievances in MOSPI Report",
    "kw_row_utility_shift": "Utility Shifting Delays in MOSPI Report",
    "kw_contractor_agency": "Contractor Performance Issues in MOSPI Report",
    "kw_equipment_supply": "Equipment / Supply Chain Constraints in MOSPI Report",
    "kw_funding_financial": "Funding / Cashflow Constraints in MOSPI Report",
    "kw_monsoon_weather": "Monsoon / Weather Impact in MOSPI Report",
    "kw_geological_technical": "Geotechnical / Technical Surprises in MOSPI Report",
    "kw_law_and_order": "Law & Order / Local Unrest in MOSPI Report",
    "kw_railway_line_issue": "Railway Line Crossing Approvals Pending",
    "kw_defence_land": "Defence Land Handover Pending",
    "kw_admin_approval_delay": "Administrative Sanction Delays in MOSPI Report",
}

# Regex / keyword patterns to highlight within the raw MOSPI narrative text
KEYWORD_HIGHLIGHT_PATTERNS = {
    "kw_court_litigation": [r"\bcourt\b", r"\blitigation\b", r"\bstay order\b", r"\bhigh court\b", r"\bsupreme court\b", r"\binjunction\b", r"\bsub[- ]judice\b", r"\badvocate\b"],
    "kw_forest_clearance": [r"\bforest clearance\b", r"\bforest land\b", r"\bforest\b", r"\bmoef\b", r"\bnpv\b", r"\bcampa\b", r"\btree cutting\b"],
    "kw_environment_clearance": [r"\benvironment(al)? clearance\b", r"\benvironment\b", r"\bseiaa\b", r"\bmoefcc\b", r"\bpollution control\b"],
    "kw_rr_resettlement": [r"\bresettlement\b", r"\brehabilitation\b", r"\br&r\b", r"\bproject affected\b", r"\bpaps?\b", r"\bdisplaced\b"],
    "kw_compensation_dispute": [r"\bcompensation\b", r"\barbitration\b", r"\bdisbursement\b", r"\benhancement\b", r"\baward\b", r"\brfctlarr\b"],
    "kw_row_utility_shift": [r"\bright of way\b", r"\brow\b", r"\butility\b", r"\bshifting\b", r"\belectric line\b", r"\bpipeline\b", r"\btransmission\b"],
    "kw_contractor_agency": [r"\bcontractor\b", r"\bagency\b", r"\bpoor performance\b", r"\bcontract\b", r"\btermination\b", r"\bprogress is slow\b"],
    "kw_equipment_supply": [r"\bequipment\b", r"\bsupply\b", r"\bvendor\b", r"\bmaterial\b", r"\bprocurement\b", r"\bcalandria\b", r"\bpump\b"],
    "kw_funding_financial": [r"\bfund(ing)?\b", r"\bfinancial\b", r"\bbudget\b", r"\bsanction\b", r"\bnon[- ]release\b", r"\btranche\b"],
    "kw_monsoon_weather": [r"\bmonsoon\b", r"\brain(fall)?\b", r"\bflood\b", r"\bweather\b", r"\binundation\b"],
    "kw_geological_technical": [r"\bgeological\b", r"\brock strata\b", r"\btechnical\b", r"\bstrata\b", r"\bexcavation\b", r"\bdesign changes?\b"],
    "kw_law_and_order": [r"\blaw and order\b", r"\bagitation\b", r"\bprotest\b", r"\bstrike\b", r"\bbandh\b", r"\bpolice\b"],
    "kw_railway_line_issue": [r"\brailway( line)?\b", r"\brailway crossing\b", r"\btraffic block\b", r"\brob\b", r"\brub\b"],
    "kw_defence_land": [r"\bdefence( land)?\b", r"\bmilitary\b", r"\bministry of defence\b", r"\bdgde\b"],
    "kw_admin_approval_delay": [r"\badministrative\b", r"\bapproval\b", r"\bnodal officer\b", r"\bgovernment order\b", r"\bclearance pending\b"],
}

def get_recommendations_for_drivers(drivers: list) -> list:
    """Generate deterministic, auditable recommendations from top drivers."""
    recommendations = []
    for driver in drivers:
        d = str(driver).strip()
        # Direct exact match
        if d in RECOMMENDATION_RULES:
            recommendations.extend(RECOMMENDATION_RULES[d])
            continue
        # Prefix / partial match
        matched = False
        for rule_key, actions in RECOMMENDATION_RULES.items():
            if rule_key in d or d in rule_key:
                recommendations.extend(actions)
                matched = True
                break
        if not matched and d.startswith("sector_extracted_"):
            recommendations.append(f"Conduct sector-wide review for {d.replace('sector_extracted_', '')} infrastructure delays")
        elif not matched and d.startswith("region_final_"):
            recommendations.append(f"Escalate regional delays in {d.replace('region_final_', '')} at Regional Development Coordination Forum")

    if not recommendations:
        recommendations.append("Conduct comprehensive quarterly progress audit and review milestone compliance")

    # Deduplicate while preserving order
    return list(dict.fromkeys(recommendations))[:4]

def get_friendly_driver_name(raw_feature: str) -> str:
    """Map raw model feature name to human-readable policymaker label."""
    if raw_feature in FRIENDLY_FEATURE_NAMES:
        return FRIENDLY_FEATURE_NAMES[raw_feature]
    if raw_feature.startswith("sector_extracted_"):
        return f"Sector: {raw_feature.replace('sector_extracted_', '').title()} Historical Pattern"
    if raw_feature.startswith("region_final_"):
        return f"Region: {raw_feature.replace('region_final_', '').title()} Historical Pattern"
    # Format generic names
    return raw_feature.replace("_", " ").title()
