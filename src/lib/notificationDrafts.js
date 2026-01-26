/**
 * Notification Draft Generators for IncidentIQ
 * Generates pre-drafted notifications for COO, Ofsted, and RIDDOR
 */

const incidentTypeNames = {
  childAccident: 'Child Accident/Injury',
  staffAccident: 'Staff Accident/Injury',
  allergyBreach: 'Allergy Breach',
  nearMiss: 'Near Miss',
}

/**
 * Generate COO notification email for serious incidents
 */
export function generateCOONotification(incidentData, incidentType, analysis) {
  const typeName = incidentTypeNames[incidentType] || incidentType
  const date = formatDate(incidentData.incidentDate)

  const subject = `URGENT: Incident at ${incidentData.nursery} - ${date} - ${typeName}`

  const body = `Dear Sarah,

I am writing to inform you of an incident that requires your attention.

INCIDENT SUMMARY
----------------
Nursery: ${incidentData.nursery}
Date: ${date}
Time: ${incidentData.incidentTime}
Type: ${typeName}
Reference: ${incidentData.incidentReference || 'Pending'}

WHO WAS INVOLVED
----------------
Name: ${incidentData.personName}
${incidentType !== 'staffAccident'
  ? `Age: ${incidentData.personAge || 'Not recorded'}
Room: ${incidentData.personRoom || 'Not recorded'}`
  : `Role: ${incidentData.personRole || 'Not recorded'}`}

WHAT HAPPENED
-------------
Location: ${incidentData.location}${incidentData.locationDetail ? ` (${incidentData.locationDetail})` : ''}

${incidentData.description}

${incidentData.severity ? `Severity: ${formatSeverity(incidentData.severity)}` : ''}

IMMEDIATE ACTIONS TAKEN
-----------------------
${incidentData.firstAidGiven === 'yes' ? `- First aid provided: ${incidentData.firstAidDetails || 'Yes'}` : '- No first aid required'}
${incidentData.medicalAttentionRequired === 'yes' ? `- Medical attention: ${incidentData.medicalAttentionDetails || 'Required'}` : ''}
${incidentData.hospitalAttendance === 'yes' ? '- Hospital attendance: Yes' : ''}
${incidentData.parentsNotified === 'yes' ? `- Parents notified at ${incidentData.parentsNotifiedTime || 'time not recorded'} by ${incidentData.parentsNotifiedBy || 'staff'}` : ''}

REGULATORY IMPLICATIONS
-----------------------
Ofsted Notification: ${formatDecision(incidentData.ofstedNotifiable)}${analysis?.ofstedRecommendation ? ` (AI assessment: ${analysis.ofstedRecommendation})` : ''}
RIDDOR Reportable: ${formatDecision(incidentData.riddorReportable)}${analysis?.riddorRecommendation ? ` (AI assessment: ${analysis.riddorRecommendation})` : ''}

${analysis ? `
AI ANALYSIS SUMMARY
-------------------
${analysis.summary}
` : ''}

PLANNED ACTIONS
---------------
${incidentData.remedialMeasures || 'To be determined'}
${incidentData.remedialResponsible ? `Responsible: ${incidentData.remedialResponsible}` : ''}
${incidentData.remedialTargetDate ? `Target date: ${incidentData.remedialTargetDate}` : ''}

NEXT STEPS REQUIRED
-------------------
- Please confirm if any additional actions are required
- Advise on any communications needed to parents/staff
- Confirm regulatory notification approach

Please let me know if you need any further information.

Kind regards,
${incidentData.reportedBy}
${incidentData.nursery}`

  return {
    subject,
    body,
    mailto: `mailto:sarah@hopscotchnurseries.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    recipient: 'COO',
  }
}

/**
 * Generate Ofsted notification draft per EYFS 2024 requirements
 */
export function generateOfstedDraft(incidentData, incidentType, analysis) {
  const typeName = incidentTypeNames[incidentType] || incidentType
  const date = formatDate(incidentData.incidentDate)
  const today = formatDate(new Date().toISOString().split('T')[0])

  const subject = `Notification to Ofsted - ${incidentData.nursery} - ${date}`

  const body = `NOTIFICATION TO OFSTED
Early Years Registration

Date of Notification: ${today}

PROVIDER DETAILS
----------------
Provider Name: Hopscotch Childrens Nurseries Ltd
Setting Name: ${incidentData.nursery}
URN: [Insert URN]
Address: [Insert Setting Address]
Nominated Individual: Sarah Sheridan

NOTIFICATION TYPE
-----------------
${getOfstedNotificationType(incidentType, incidentData)}

INCIDENT DETAILS
----------------
Date of Incident: ${date}
Time of Incident: ${incidentData.incidentTime}
Location: ${incidentData.location}${incidentData.locationDetail ? ` - ${incidentData.locationDetail}` : ''}

${incidentType !== 'staffAccident' ? `
CHILD INFORMATION
-----------------
Name: ${incidentData.personName}
Date of Birth: ${incidentData.personDob || '[To be added]'}
Age: ${incidentData.personAge || 'Not recorded'}
Gender: ${incidentData.personGender || 'Not recorded'}
Room: ${incidentData.personRoom || 'Not recorded'}
` : `
PERSON INVOLVED
---------------
Name: ${incidentData.personName}
Role: ${incidentData.personRole || 'Not recorded'}
`}

DESCRIPTION OF INCIDENT
-----------------------
${incidentData.description}

${incidentData.injuryTypes?.length ? `
Injuries sustained: ${incidentData.injuryTypes.join(', ')}
Body areas affected: ${incidentData.bodyAreas?.join(', ') || 'Not specified'}
Severity: ${formatSeverity(incidentData.severity)}
` : ''}

IMMEDIATE ACTION TAKEN
----------------------
${incidentData.firstAidGiven === 'yes' ? `First Aid: ${incidentData.firstAidDetails || 'Provided'}` : 'No first aid required'}
${incidentData.medicalAttentionRequired === 'yes' ? `
Medical attention: ${incidentData.medicalAttentionDetails || 'Required'}
Hospital attendance: ${incidentData.hospitalAttendance === 'yes' ? 'Yes' : 'No'}` : ''}
${incidentData.parentsNotified === 'yes' ? `
Parents/carers notified: Yes
Time notified: ${incidentData.parentsNotifiedTime || 'Not recorded'}
Method: ${incidentData.parentsNotifiedBy ? `By ${incidentData.parentsNotifiedBy}` : 'Not recorded'}` : ''}

INVESTIGATION FINDINGS
----------------------
${incidentData.investigationFindings || 'Investigation ongoing'}

ACTIONS TO PREVENT RECURRENCE
-----------------------------
${incidentData.remedialMeasures || 'To be determined following full investigation'}
${incidentData.remedialResponsible ? `Person responsible: ${incidentData.remedialResponsible}` : ''}
${incidentData.remedialTargetDate ? `Target completion date: ${incidentData.remedialTargetDate}` : ''}

ADDITIONAL INFORMATION
----------------------
${analysis?.additionalConcerns && analysis.additionalConcerns !== 'None identified'
  ? analysis.additionalConcerns
  : 'No additional concerns at this time.'}

RIDDOR: ${incidentData.riddorReportable === 'yes' ? 'A RIDDOR report has been/will be submitted' : 'Not reportable under RIDDOR'}

DECLARATION
-----------
I confirm that the information provided in this notification is accurate and complete to the best of my knowledge.

Signed: _______________________
Name: ${incidentData.reportedBy}
Position: [Insert Position]
Date: ${today}

Contact telephone: [Insert Number]
Contact email: [Insert Email]`

  return {
    subject,
    body,
    recipient: 'Ofsted Early Years',
    recipientEmail: 'enquiries@ofsted.gov.uk',
  }
}

/**
 * Generate RIDDOR F2508-style report draft
 */
export function generateRIDDORDraft(incidentData, incidentType, analysis) {
  const typeName = incidentTypeNames[incidentType] || incidentType
  const date = formatDate(incidentData.incidentDate)
  const today = formatDate(new Date().toISOString().split('T')[0])

  const subject = `RIDDOR Report - ${incidentData.nursery} - ${date}`

  const body = `RIDDOR REPORT (F2508 Format)
Report of an injury, dangerous occurrence or case of disease

This report should be submitted via the HSE website: www.hse.gov.uk/riddor

Date of Report: ${today}
Reference: ${incidentData.incidentReference || '[To be assigned]'}

PART A: ABOUT YOU (THE NOTIFIER)
================================
1. Name of notifier: ${incidentData.reportedBy}
2. Job title: [Insert Job Title]
3. Contact telephone: [Insert Number]
4. Contact email: [Insert Email]

5. Name of employer: Hopscotch Childrens Nurseries Ltd
6. Address:
   ${incidentData.nursery}
   [Insert Full Address]
   [Insert Postcode]

PART B: ABOUT THE INCIDENT
==========================
7. Date of incident: ${incidentData.incidentDate}
8. Time of incident: ${incidentData.incidentTime}
9. Local authority area: [Insert LA Name]

10. Location where incident happened:
    ${incidentData.nursery}
    ${incidentData.location}${incidentData.locationDetail ? ` - ${incidentData.locationDetail}` : ''}

11. In which department or work area: ${incidentData.location}

PART C: ABOUT THE INJURED PERSON
================================
12. Full name: ${incidentData.personName}
${incidentType === 'staffAccident' ? `
13. Relationship to your business: Employee
14. Job title: ${incidentData.personRole || '[Insert Role]'}
15. Employment status: [Permanent/Temporary/Agency]
` : `
13. Relationship to your business: Member of the public (child in care)
14. Date of birth: ${incidentData.personDob || '[Insert DOB]'}
15. Gender: ${incidentData.personGender || '[Insert Gender]'}
`}

PART D: KIND OF ACCIDENT
========================
16. What kind of accident led to the injury?
${getAccidentKind(incidentData)}

17. Description of what happened:
${incidentData.description}

PART E: THE INJURY
==================
18. What was the injury?
${incidentData.injuryTypes?.join(', ') || 'Not specified'}

19. What part of the body was injured?
${incidentData.bodyAreas?.join(', ') || 'Not specified'}

20. Was the injury serious enough for the person to:
${incidentData.hospitalAttendance === 'yes' ? '- Go to hospital: YES' : '- Go to hospital: NO'}
${incidentType === 'staffAccident' ? `
- Be incapacitated for over 7 days: [YES/NO - confirm actual absence]
- Result in a specified injury: [YES/NO]` : ''}

PART F: FIRST AID / MEDICAL TREATMENT
=====================================
21. First aid given at scene: ${incidentData.firstAidGiven === 'yes' ? 'Yes' : 'No'}
${incidentData.firstAidDetails ? `Details: ${incidentData.firstAidDetails}` : ''}

22. Medical treatment required: ${incidentData.medicalAttentionRequired === 'yes' ? 'Yes' : 'No'}
${incidentData.medicalAttentionDetails ? `Details: ${incidentData.medicalAttentionDetails}` : ''}

PART G: ABOUT WHAT CAUSED THE INCIDENT
======================================
23. Agent involved (what caused the injury):
${getAgentInvolved(incidentData)}

24. Immediate causes:
${incidentData.injuryCauses?.join(', ') || 'See description'}

25. Underlying causes identified:
${formatRootCauses(incidentData.rootCauseAnalysis)}

PART H: ACTIONS TAKEN
=====================
26. What actions have been taken to prevent recurrence?
${incidentData.remedialMeasures || 'Investigation ongoing - actions to be determined'}

27. Person responsible for actions: ${incidentData.remedialResponsible || 'To be assigned'}
28. Target date for completion: ${incidentData.remedialTargetDate || 'To be determined'}

PART I: OTHER REPORTS
=====================
29. Has this been reported to any other authority?
- Ofsted: ${incidentData.ofstedNotifiable === 'yes' ? 'Yes - notification submitted/pending' : 'No'}
- Police: [YES/NO]
- Local Authority: [YES/NO]

DECLARATION
===========
I declare that the information I have given is true to the best of my knowledge.

Signature: _______________________
Name: ${incidentData.reportedBy}
Date: ${today}

NOTES
-----
- This form must be submitted within 15 days of the incident (or 10 days for deaths)
- Keep a copy for your records for at least 3 years
- Submit online at: www.hse.gov.uk/riddor/report.htm`

  return {
    subject,
    body,
    recipient: 'HSE RIDDOR',
    recipientUrl: 'https://www.hse.gov.uk/riddor/report.htm',
  }
}

// Helper functions

function formatDate(dateStr) {
  if (!dateStr) return 'Not specified'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatSeverity(severity) {
  const severityLabels = {
    minor: 'Minor',
    moderate: 'Moderate',
    serious: 'Serious',
    critical: 'Critical',
  }
  return severityLabels[severity] || severity || 'Not assessed'
}

function formatDecision(decision) {
  if (decision === 'yes') return 'Yes - to be submitted'
  if (decision === 'no') return 'No - not required'
  if (decision === 'unsure') return 'Under review'
  return 'Not yet determined'
}

function getOfstedNotificationType(incidentType, data) {
  const types = []

  if (incidentType === 'childAccident' && (data.severity === 'serious' || data.severity === 'critical')) {
    types.push('Serious injury to a child')
  }
  if (incidentType === 'allergyBreach' && data.reactionOccurred === 'yes') {
    types.push('Serious illness - allergic reaction')
  }
  if (data.hospitalAttendance === 'yes') {
    types.push('Injury requiring hospital treatment')
  }

  if (types.length === 0) {
    types.push('Significant event affecting the welfare of a child')
  }

  return types.map(t => `[X] ${t}`).join('\n')
}

function getAccidentKind(data) {
  const causes = data.injuryCauses || []
  const mappings = {
    'Fall': 'Fall from height / Slip, trip or fall on same level',
    'Collision': 'Struck by moving object / Collision with person',
    'Trip': 'Slip, trip or fall on same level',
    'Hit by object': 'Struck by moving or falling object',
    'Bitten': 'Injured by an animal / Contact with person',
    'Scratched': 'Contact with person',
    'Equipment': 'Contact with machinery or equipment',
    'Burn': 'Contact with hot surface or substance',
  }

  const kinds = causes.map(c => mappings[c] || c).filter(Boolean)
  return kinds.length > 0 ? kinds.join('\n') : 'See description above'
}

function getAgentInvolved(data) {
  const location = data.location || ''
  const causes = data.injuryCauses || []

  if (location.includes('Outdoor') || location.includes('Garden')) {
    return 'Outdoor play equipment / Ground surface'
  }
  if (causes.some(c => c.includes('Equipment'))) {
    return 'Indoor/outdoor equipment'
  }
  if (causes.some(c => c.includes('Fall') || c.includes('Trip'))) {
    return 'Floor / ground surface'
  }

  return 'See description - to be specified'
}

function formatRootCauses(rootCauseAnalysis) {
  if (!rootCauseAnalysis || Object.keys(rootCauseAnalysis).length === 0) {
    return 'Under investigation'
  }

  const causes = []
  Object.entries(rootCauseAnalysis).forEach(([category, items]) => {
    if (items && items.length > 0) {
      causes.push(`${category}: ${items.join(', ')}`)
    }
  })

  return causes.length > 0 ? causes.join('\n') : 'Under investigation'
}
