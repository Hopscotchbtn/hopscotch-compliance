import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured. Running in offline mode.')
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export const submitCheck = async (checkData) => {
  if (!supabase) {
    console.log('Offline mode: Check would be submitted:', checkData)
    return { data: [{ id: 'offline-' + Date.now(), ...checkData }], error: null }
  }

  const { data, error } = await supabase
    .from('checks')
    .insert([{
      nursery: checkData.nursery,
      room: checkData.room,
      check_type: checkData.checkType,
      completed_by: checkData.completedBy,
      items: checkData.items,
      has_issues: checkData.items.some(item => item.status === 'fail'),
      overall_notes: checkData.notes || null,
      water_temperature: checkData.waterTemperature || null,
    }])
    .select()

  if (error) throw error
  return { data, error: null }
}

export const getTodayChecks = async (nurseryFilter = null) => {
  if (!supabase) {
    console.log('Offline mode: Would fetch today\'s checks')
    return []
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let query = supabase
    .from('checks')
    .select('*')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })

  if (nurseryFilter && nurseryFilter !== 'all') {
    query = query.eq('nursery', nurseryFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching checks:', error)
    return []
  }

  return data || []
}

export const getTodayChecksByType = async (nursery, checkType) => {
  if (!supabase) {
    console.log('Offline mode: Would fetch today\'s checks by type')
    return []
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('nursery', nursery)
    .eq('check_type', checkType)
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching checks:', error)
    return []
  }

  return data || []
}

export const getChecksHistory = async (nursery, days = 30) => {
  if (!supabase) {
    console.log('Offline mode: Would fetch checks history')
    return []
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  let query = supabase
    .from('checks')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (nursery && nursery !== 'all') {
    query = query.eq('nursery', nursery)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching checks history:', error)
    return []
  }

  return data || []
}

