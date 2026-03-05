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
      signature_url: checkData.signatureUrl || null,
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

// Resize image to max dimension, returns base64 JPEG
const resizeImage = (dataUrl, maxDim = 1200) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.src = dataUrl
  })
}

export const uploadCheckPhoto = async (dataUrl, checkType, itemId) => {
  if (!supabase) {
    console.log('Offline mode: Would upload photo')
    return null
  }

  const resized = await resizeImage(dataUrl)
  const base64 = resized.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const path = `${Date.now()}-${checkType}-${itemId}.jpg`

  const { error } = await supabase.storage
    .from('check-photos')
    .upload(path, bytes, { contentType: 'image/jpeg' })

  if (error) {
    console.error('Photo upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage
    .from('check-photos')
    .getPublicUrl(path)

  return urlData.publicUrl
}

export const uploadSignature = async (dataUrl) => {
  if (!supabase) {
    console.log('Offline mode: Would upload signature')
    return null
  }

  const base64 = dataUrl.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const path = `${Date.now()}-signature.png`

  const { error } = await supabase.storage
    .from('check-signatures')
    .upload(path, bytes, { contentType: 'image/png' })

  if (error) {
    console.error('Signature upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage
    .from('check-signatures')
    .getPublicUrl(path)

  return urlData.publicUrl
}

export const getChecksForWeek = async (nursery, weekStart, weekEnd) => {
  if (!supabase) {
    console.log('Offline mode: Would fetch checks for week')
    return []
  }

  const start = new Date(weekStart); start.setHours(0, 0, 0, 0)
  const end = new Date(weekEnd); end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('nursery', nursery)
    .eq('room', 'Holiday Club')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching checks for week:', error)
    throw error
  }

  return data || []
}

export const getFirstAidChecksForWeek = async (nursery, weekStart, weekEnd) => {
  if (!supabase) return []

  const start = new Date(weekStart); start.setHours(0, 0, 0, 0)
  const end = new Date(weekEnd); end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('nursery', nursery)
    .eq('check_type', 'firstAidBox')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const getChecksForDateRange = async (nursery, startDate, endDate, filters = {}) => {
  if (!supabase) return []

  const start = new Date(startDate); start.setHours(0, 0, 0, 0)
  const end = new Date(endDate); end.setHours(23, 59, 59, 999)

  let query = supabase
    .from('checks')
    .select('*')
    .eq('nursery', nursery)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (filters.room) query = query.eq('room', filters.room)
  if (filters.checkType) query = query.eq('check_type', filters.checkType)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const getCustomRooms = async (nursery, checkTypeId) => {
  if (!supabase) return []

  const { data } = await supabase
    .from('checks')
    .select('id, items')
    .eq('nursery', nursery)
    .eq('check_type', 'customRoomList')
    .eq('room', checkTypeId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!data?.length) return []
  return data[0].items?.map(i => i.text) || []
}

export const saveCustomRooms = async (nursery, checkTypeId, rooms) => {
  if (!supabase) return

  const { data: existing } = await supabase
    .from('checks')
    .select('id')
    .eq('nursery', nursery)
    .eq('check_type', 'customRoomList')
    .eq('room', checkTypeId)
    .limit(1)

  const record = {
    nursery,
    room: checkTypeId,
    check_type: 'customRoomList',
    completed_by: 'system',
    items: rooms.map((text, i) => ({ id: String(i), text, status: 'pass' })),
    has_issues: false,
  }

  if (existing?.length) {
    await supabase.from('checks').update(record).eq('id', existing[0].id)
  } else {
    await supabase.from('checks').insert([record])
  }
}

export const getTodayKitchenSafetyCheck = async (nursery) => {
  if (!supabase) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('checks')
    .select('items')
    .eq('nursery', nursery)
    .eq('check_type', 'kitchenSafety')
    .gte('created_at', today.toISOString())
    .limit(1)

  if (!data?.length) return null

  // Return completed sections derived from items
  const completed = {}
  data[0].items?.forEach(item => {
    if (item.status === 'pass') completed[item.id] = true
  })
  return completed
}

export const upsertKitchenSafetyCheck = async (nursery, checkData) => {
  if (!supabase) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: existing } = await supabase
    .from('checks')
    .select('id')
    .eq('nursery', nursery)
    .eq('check_type', 'kitchenSafety')
    .gte('created_at', today.toISOString())
    .limit(1)

  const record = {
    nursery,
    room: 'Kitchen',
    check_type: 'kitchenSafety',
    completed_by: checkData.completedBy,
    items: checkData.items,
    has_issues: false,
    overall_notes: checkData.notes || null,
    signature_url: null,
  }

  if (existing?.length) {
    await supabase.from('checks').update(record).eq('id', existing[0].id)
  } else {
    await supabase.from('checks').insert([record])
  }
}

export const getLastCheck = async (nursery, checkType) => {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('checks')
    .select('created_at, completed_by')
    .eq('nursery', nursery)
    .eq('check_type', checkType)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data?.length) return null
  return data[0]
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

