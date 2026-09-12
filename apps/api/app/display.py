"""Display copy for system-authored records; stored data and exports retain provenance."""
from copy import deepcopy

COPY = {
    "Synthetic population record. Open the available work item to inspect its review context.": "An open review item is available for this member.",
    "Synthetic enrolled member. No work item is open in this demonstration.": "No open review items.",
    "The encounter documents diabetes and chronic kidney disease. Compare the combined full-member scenario after a reviewed model pack is configured. No official code mapping, coefficient, or score is installed in this demo.": "The encounter documents diabetes and chronic kidney disease. Compare the combined member scenario after a validated model is configured. Scoring is not configured.",
    "COPD is explicitly documented, but the source has no clinician signature metadata. The selected demo source policy blocks preparation until a signed encounter source is supplied. Route a remediation task.": "COPD is documented, but clinician signature metadata is missing. Request signed encounter documentation before preparing the record.",
    "Synthetic demonstration record": "Encounter details",
    "Applicable demonstration policy": "Source eligibility policy",
    "Sample intake · signed primary care note": "Signed primary care note",
    "Sample intake · mismatched member": "Member identification discrepancy",
    "Later completed encounter · synthetic example": "Follow-up encounter",
    "No clinician signature metadata is present. This demo policy requires signed encounter documentation.": "Clinician signature metadata is missing. Signed encounter documentation is required.",
    "Electronically signed by the synthetic treating clinician at Northbrook Family Care on August 28, 2026.": "Electronically signed by the treating clinician at Northbrook Family Care on August 28, 2026.",
    "Electronically signed by the synthetic treating clinician at the completed encounter.": "Electronically signed by the treating clinician.",
    "This prepared synthetic encounter occurs after the fixed September 12 demonstration clock. It is available only when the presenter loads the later encounter scenario.": "Prepared follow-up documentation, dated after the September 12 reference period, is available for a new review.",
    "Diabetes mellitus and chronic kidney disease are both documented and assessed at this synthetic encounter.": "Diabetes mellitus and chronic kidney disease are documented and assessed at this encounter.",
    "DEMO-SOURCE-ELIGIBILITY version 1.0 requires signed encounter documentation. Failed check: missing_signature. Request the signed source or completed signature metadata; preparation remains blocked until remediation is reviewed.": "Source eligibility policy version 1.0 requires signed encounter documentation. Clinician signature metadata is missing. Request the signed source or completed signature metadata before continuing.",
    "The synthetic member identifier and demographics match the selected member.": "Member identification and demographics match the selected record.",
    "The date, clinician signature metadata, and document pages are present. This prepared sample can be published to the member timeline after intake review.": "Service date, clinician signature metadata and document pages are present. The document can be published after intake review.",
    "Keep the sample quarantined and route the patient-match discrepancy for review.": "Keep the document quarantined until the member identification discrepancy is reviewed.",
    "Demo receiver": "Encounter processing",
    "Prepared sample encounter record. No real transmission occurs.": "Encounter record prepared for processing.",
    "The prepared sample is missing a required source reference.": "A required source reference is missing.",
    "Simulated receiver accepted this record. Payment reconciliation remains separate.": "Acceptance recorded. Payment reconciliation is separate.",
    "Simulated receiver rejected this attempt. Preserve its history and prepare linked remediation.": "Rejection recorded. Prepare a linked correction while retaining this attempt.",
    "Linked remediation awaiting a simulated terminal response. Original record retained.": "Linked correction awaiting a final response. The original record is retained.",
    "Demo task created.": "Task created.",
    "Later encounter example loaded. A new review is required.": "Follow-up encounter added. A new review is required.",
    "Simulated receiver workflow updated.": "Response recorded.",
}

def text(value):
    return COPY.get(value, value)

def document(value):
    # Clinical source quotations and policy provenance must remain exact.
    return deepcopy(value)

def member(value):
    result = value | {'summary': text(value.get('summary', ''))}
    if 'documents' in value:
        result['documents'] = [document(d) for d in value['documents']]
    return result

def submission(value):
    return value | {'receiver': text(value['receiver']), 'reason': text(value['reason'])}
