import { supabase } from './supabase'

export const saveRiskAssessment = async (assessmentData) => {
  if (!supabase) {
    console.log('Offline mode: Assessment would be saved:', assessmentData)
    return { data: [{ id: 'offline-' + Date.now(), ...assessmentData }], error: null }
  }

  const dbData = {
    reference: assessmentData.reference || generateReference(assessmentData),
    nursery: assessmentData.nursery,
    location: assessmentData.location,
    status: assessmentData.status || 'draft',
    assessment_type: assessmentData.assessmentType,
    assessment_date: assessmentData.assessmentDate,
    assessor_name: assessmentData.assessorName,
    activity_description: assessmentData.activityDescription || assessmentData.activityName,
    people_at_risk: Array.isArray(assessmentData.peopleAtRisk)
      ? assessmentData.peopleAtRisk
      : (assessmentData.peopleAtRisk || '').split(',').map(s => s.trim()),
    policies_selected: assessmentData.policiesSelected || [],
    hazards: assessmentData.hazards || [],
    safe_system_of_work: assessmentData.safeSystemOfWork,
    review_date: assessmentData.reviewDate,
    docx_url: assessmentData.docxUrl,
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .insert([dbData])
    .select()

  if (error) throw error
  return { data, error: null }
}

export const updateRiskAssessment = async (id, fields) => {
  if (!supabase) {
    console.log('Offline mode: Would update assessment', id, fields)
    return { data: { id, ...fields }, error: null }
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return { data, error: null }
}

export const getRiskAssessmentById = async (id) => {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error fetching risk assessment:', err)
    return null
  }
}

export const deleteRiskAssessment = async (id) => {
  if (!supabase) return { error: null }

  const { error } = await supabase
    .from('risk_assessments')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { error: null }
}

export const getRiskAssessmentStats = async () => {
  if (!supabase) {
    return { drafts: 0, completed: 0, thisMonth: 0 }
  }

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [draftsResult, completedResult, thisMonthResult] = await Promise.all([
      supabase.from('risk_assessments').select('id', { count: 'exact' }).eq('status', 'draft'),
      supabase.from('risk_assessments').select('id', { count: 'exact' }).eq('status', 'completed'),
      supabase.from('risk_assessments').select('id', { count: 'exact' }).gte('created_at', startOfMonth),
    ])

    return {
      drafts: draftsResult.count || 0,
      completed: completedResult.count || 0,
      thisMonth: thisMonthResult.count || 0,
    }
  } catch (err) {
    console.error('Error fetching stats:', err)
    return { drafts: 0, completed: 0, thisMonth: 0 }
  }
}

export const getDraftAssessments = async () => {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('risk_assessments')
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

export const getRecentAssessments = async (limit = 10) => {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching assessments:', err)
    return []
  }
}

export const trackAssessmentEvent = async (eventType, assessmentData) => {
  if (!supabase) {
    console.log('Offline mode: Would track event:', eventType, assessmentData)
    return
  }

  try {
    await supabase.from('assessment_events').insert([{
      event_type: eventType,
      location: assessmentData.location,
      assessment_type: assessmentData.assessmentType,
      people_at_risk: assessmentData.peopleAtRisk,
      policies_selected: assessmentData.policiesSelected,
    }])
  } catch (err) {
    console.error('Error tracking event:', err)
  }
}

function generateReference(data) {
  const date = new Date(data.assessmentDate || new Date())
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '')
  const initials = (data.assessorName || 'XX').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RA-${dateStr}-${initials}-${random}`
}
