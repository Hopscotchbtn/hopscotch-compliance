export async function brainstormHazards(assessmentData) {
  try {
    const response = await fetch('/api/brainstorm-hazards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assessmentData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to brainstorm hazards')
    }

    const data = await response.json()
    return data.suggested_hazards || []
  } catch (error) {
    console.error('Brainstorm hazards error:', error)
    throw error
  }
}

export async function generateAssessmentDraft(assessmentData) {
  try {
    const response = await fetch('/api/generate-assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assessmentData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate assessment')
    }

    return await response.json()
  } catch (error) {
    console.error('Generate assessment error:', error)
    throw error
  }
}

export async function generateDocx(assessmentData, fileName) {
  try {
    const response = await fetch('/api/generate-docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: assessmentData, fileName }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate document' }))
      throw new Error(error.error || 'Failed to generate document')
    }

    // Get the blob from the response
    const blob = await response.blob()

    // Create a download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || 'Risk Assessment.docx'
    document.body.appendChild(a)
    a.click()

    // Cleanup
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    return { success: true }
  } catch (error) {
    console.error('Generate DOCX error:', error)
    throw error
  }
}

export function formatAssessmentForDocx(draft, formData) {
  // Merge draft data with form data to create complete document data
  return {
    assessment_type: draft.assessment_type || formData.assessmentType,
    assessment_date: draft.assessment_date || formData.assessmentDate,
    assessor_name: draft.assessor_name || formData.assessorName,
    unique_id: draft.unique_id,
    activity_description: draft.activity_description || formData.activityName,
    location: draft.location || formData.location,
    people_at_risk: draft.people_at_risk || (Array.isArray(formData.peopleAtRisk) ? formData.peopleAtRisk.join(', ') : formData.peopleAtRisk),
    review_date: draft.review_date,
    safe_system_of_work: draft.safe_system_of_work,
    // Hazard fields (1-10)
    hazard_1: draft.hazard_1 || '',
    pre_rating_1: draft.pre_rating_1 || '',
    control_measures_1: draft.control_measures_1 || '',
    post_rating_1: draft.post_rating_1 || '',
    additional_controls_1: draft.additional_controls_1 || '',
    reassess_rating_1: draft.reassess_rating_1 || '',
    hazard_2: draft.hazard_2 || '',
    pre_rating_2: draft.pre_rating_2 || '',
    control_measures_2: draft.control_measures_2 || '',
    post_rating_2: draft.post_rating_2 || '',
    additional_controls_2: draft.additional_controls_2 || '',
    reassess_rating_2: draft.reassess_rating_2 || '',
    hazard_3: draft.hazard_3 || '',
    pre_rating_3: draft.pre_rating_3 || '',
    control_measures_3: draft.control_measures_3 || '',
    post_rating_3: draft.post_rating_3 || '',
    additional_controls_3: draft.additional_controls_3 || '',
    reassess_rating_3: draft.reassess_rating_3 || '',
    hazard_4: draft.hazard_4 || '',
    pre_rating_4: draft.pre_rating_4 || '',
    control_measures_4: draft.control_measures_4 || '',
    post_rating_4: draft.post_rating_4 || '',
    additional_controls_4: draft.additional_controls_4 || '',
    reassess_rating_4: draft.reassess_rating_4 || '',
    hazard_5: draft.hazard_5 || '',
    pre_rating_5: draft.pre_rating_5 || '',
    control_measures_5: draft.control_measures_5 || '',
    post_rating_5: draft.post_rating_5 || '',
    additional_controls_5: draft.additional_controls_5 || '',
    reassess_rating_5: draft.reassess_rating_5 || '',
    hazard_6: draft.hazard_6 || '',
    pre_rating_6: draft.pre_rating_6 || '',
    control_measures_6: draft.control_measures_6 || '',
    post_rating_6: draft.post_rating_6 || '',
    additional_controls_6: draft.additional_controls_6 || '',
    reassess_rating_6: draft.reassess_rating_6 || '',
    hazard_7: draft.hazard_7 || '',
    pre_rating_7: draft.pre_rating_7 || '',
    control_measures_7: draft.control_measures_7 || '',
    post_rating_7: draft.post_rating_7 || '',
    additional_controls_7: draft.additional_controls_7 || '',
    reassess_rating_7: draft.reassess_rating_7 || '',
    hazard_8: draft.hazard_8 || '',
    pre_rating_8: draft.pre_rating_8 || '',
    control_measures_8: draft.control_measures_8 || '',
    post_rating_8: draft.post_rating_8 || '',
    additional_controls_8: draft.additional_controls_8 || '',
    reassess_rating_8: draft.reassess_rating_8 || '',
    hazard_9: draft.hazard_9 || '',
    pre_rating_9: draft.pre_rating_9 || '',
    control_measures_9: draft.control_measures_9 || '',
    post_rating_9: draft.post_rating_9 || '',
    additional_controls_9: draft.additional_controls_9 || '',
    reassess_rating_9: draft.reassess_rating_9 || '',
    hazard_10: draft.hazard_10 || '',
    pre_rating_10: draft.pre_rating_10 || '',
    control_measures_10: draft.control_measures_10 || '',
    post_rating_10: draft.post_rating_10 || '',
    additional_controls_10: draft.additional_controls_10 || '',
    reassess_rating_10: draft.reassess_rating_10 || '',
  }
}
