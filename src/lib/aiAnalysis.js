export async function analyzeIncident(incidentData, incidentType) {
  try {
    const response = await fetch('/api/analyze-incident', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ incidentData, incidentType }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze incident')
    }

    return await response.json()
  } catch (error) {
    console.error('AI analysis error:', error)
    throw error
  }
}

export async function analyzeWitnessStatement(file, incidentDescription) {
  try {
    const response = await fetch('/api/analyze-witness-statement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file, incidentDescription }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze witness statement')
    }

    return await response.json()
  } catch (error) {
    console.error('Witness statement analysis error:', error)
    throw error
  }
}

export function generateArmadilloEmail(incidentData, incidentType, analysis) {
  const incidentTypeNames = {
    childAccident: 'Child Accident/Injury',
    staffAccident: 'Staff Accident/Injury',
    allergyBreach: 'Allergy Breach',
    nearMiss: 'Near Miss',
  }

  const subject = `Incident Report - ${incidentData.nursery} - ${incidentData.incidentDate} - ${incidentTypeNames[incidentType] || incidentType}`

  const emailBody = `Dear Armadillo H&S Team,

Please find below a summary of an incident that occurred at one of our nurseries. We would appreciate your review and guidance.

INCIDENT OVERVIEW
-----------------
Reference: ${incidentData.incidentReference || 'Pending'}
Type: ${incidentTypeNames[incidentType] || incidentType}
Nursery: ${incidentData.nursery}
Date: ${incidentData.incidentDate}
Time: ${incidentData.incidentTime}

PERSON INVOLVED
---------------
Name: ${incidentData.personName}
${incidentType !== 'staffAccident' ? `Age: ${incidentData.personAge || 'Not recorded'}
Room: ${incidentData.personRoom || 'Not recorded'}` : `Role: ${incidentData.personRole || 'Not recorded'}`}

INCIDENT DESCRIPTION
--------------------
Location: ${incidentData.location}${incidentData.locationDetail ? ` (${incidentData.locationDetail})` : ''}

${incidentData.description}

${incidentData.injuryTypes?.length ? `
INJURY DETAILS
--------------
Type(s): ${incidentData.injuryTypes.join(', ')}
Cause(s): ${incidentData.injuryCauses?.join(', ') || 'Not specified'}
Body area(s): ${incidentData.bodyAreas?.join(', ') || 'Not specified'}
Severity: ${incidentData.severity || 'Not assessed'}
` : ''}

IMMEDIATE RESPONSE
------------------
First aid given: ${incidentData.firstAidGiven === 'yes' ? 'Yes' : 'No'}
${incidentData.firstAidDetails ? `Details: ${incidentData.firstAidDetails}` : ''}
Medical attention required: ${incidentData.medicalAttentionRequired || 'Unknown'}
${incidentData.hospitalAttendance === 'yes' ? 'Hospital attendance: Yes' : ''}

${analysis ? `
AI-ASSISTED ANALYSIS
--------------------
${analysis.summary}

Ofsted Notification Assessment: ${analysis.ofstedRecommendation.toUpperCase()}
${analysis.ofstedReasoning}

RIDDOR Reporting Assessment: ${analysis.riddorRecommendation.toUpperCase()}
${analysis.riddorReasoning}

Recommended Preventive Measures:
${analysis.preventiveMeasures.map(m => `• ${m}`).join('\n')}

${analysis.additionalConcerns && analysis.additionalConcerns !== 'None identified' ? `
Additional Concerns:
${analysis.additionalConcerns}
` : ''}
` : ''}

ACTIONS PLANNED
---------------
${incidentData.remedialMeasures || 'To be determined'}
${incidentData.remedialResponsible ? `Responsible: ${incidentData.remedialResponsible}` : ''}
${incidentData.remedialTargetDate ? `Target date: ${incidentData.remedialTargetDate}` : ''}

QUESTIONS FOR ARMADILLO
-----------------------
1. Please confirm whether this incident requires RIDDOR reporting
2. Any additional recommendations for preventive measures
3. Any policy or procedure updates you would recommend

Thank you for your support.

Kind regards,
${incidentData.reportedBy}
Hopscotch Nurseries`

  return {
    subject,
    body: emailBody,
    mailto: `mailto:safety@armadillo.co.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`,
  }
}
