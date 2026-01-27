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

