import { supabase } from './supabase'

export const saveIncident = async (incidentData) => {
  if (!supabase) {
    console.log('Offline mode: Incident would be saved:', incidentData)
    return { data: [{ id: 'offline-' + Date.now(), ...incidentData }], error: null }
  }

  const dbData = {
    incident_reference: incidentData.incidentReference,
    nursery: incidentData.nursery,
    incident_type: incidentData.incidentType,
    status: incidentData.status || 'draft',
    incident_date: incidentData.incidentDate,
    incident_time: incidentData.incidentTime,
    reported_by: incidentData.reportedBy,
    person_type: incidentData.personType || 'child',
    person_name: incidentData.personName,
    person_age: incidentData.personAge,
    person_dob: incidentData.personDob || null,
    person_gender: incidentData.personGender,
    person_room: incidentData.personRoom,
    person_role: incidentData.personRole,
    location: incidentData.location,
    location_detail: incidentData.locationDetail,
    description: incidentData.description,
    injury_types: incidentData.injuryTypes,
    injury_causes: incidentData.injuryCauses,
    body_areas: incidentData.bodyAreas,
    injury_severity: incidentData.severity,
    allergen_involved: incidentData.allergenInvolved,
    reaction_occurred: incidentData.reactionOccurred === 'yes',
    reaction_details: incidentData.reactionDetails,
    first_aid_given: incidentData.firstAidGiven === 'yes',
    first_aid_details: incidentData.firstAidDetails,
    medical_attention_required: incidentData.medicalAttentionRequired,
    medical_attention_details: incidentData.medicalAttentionDetails,
    hospital_attendance: incidentData.hospitalAttendance,
    parents_notified: incidentData.parentsNotified === 'yes',
    parents_notified_by: incidentData.parentsNotifiedBy,
    parent_response: incidentData.parentResponse,
    witnesses: incidentData.witnesses,
    witness_statements_taken: incidentData.witnessStatementsTaken,
    photos_taken: incidentData.photosTaken === 'yes',
    investigation_findings: incidentData.investigationFindings,
    root_cause_analysis: incidentData.rootCauseAnalysis,
    remedial_measures: incidentData.remedialMeasures,
    remedial_responsible: incidentData.remedialResponsible,
    remedial_target_date: incidentData.remedialTargetDate || null,
    ofsted_notifiable: incidentData.ofstedNotifiable,
    riddor_reportable: incidentData.riddorReportable,
    escalated_to_head_office: incidentData.escalateToHeadOffice === 'yes',
    head_office_notes: incidentData.headOfficeNotes,
  }

  const { data, error } = await supabase
    .from('incidents')
    .insert([dbData])
    .select()

  if (error) throw error
  return { data, error: null }
}

export const getIncidentStats = async () => {
  if (!supabase) {
    return { open: 0, pendingReview: 0, completedThisMonth: 0 }
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [openResult, pendingResult, completedResult] = await Promise.all([
      supabase.from('incidents').select('id', { count: 'exact' }).eq('status', 'open'),
      supabase.from('incidents').select('id', { count: 'exact' }).eq('status', 'pending-review'),
      supabase.from('incidents').select('id', { count: 'exact' }).eq('status', 'signed-off').gte('created_at', startOfMonth),
    ])

    return {
      open: openResult.count || 0,
      pendingReview: pendingResult.count || 0,
      completedThisMonth: completedResult.count || 0,
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
    return { open: 0, pendingReview: 0, completedThisMonth: 0 }
  }
}

export const getDraftIncidents = async () => {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching drafts:', err)
    return []
  }
}

export const getRecentIncidents = async (limit = 20) => {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching incidents:', err)
    return []
  }
}
