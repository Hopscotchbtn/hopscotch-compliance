const STORAGE_KEYS = {
  USER_NAME: 'hopscotch_user_name',
  LAST_NURSERY: 'hopscotch_last_nursery',
  KITCHEN_SAFETY: 'hopscotch_kitchen_safety',
  CUSTOM_ROOMS: 'hopscotch_custom_rooms',
}

const todayStr = () => new Date().toISOString().slice(0, 10)

const loadHistory = (nursery) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.KITCHEN_SAFETY}_${nursery}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Migrate legacy format { date, completedSections, sectionData }
    if (parsed.date) {
      return { [parsed.date]: { completedSections: parsed.completedSections, sectionData: parsed.sectionData } }
    }
    return parsed
  } catch {
    return {}
  }
}

export const storage = {
  getUserName: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_NAME) || ''
    } catch {
      return ''
    }
  },

  setUserName: (name) => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_NAME, name)
    } catch {
      console.warn('Could not save user name to localStorage')
    }
  },

  getLastNursery: () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_NURSERY) || ''
    } catch {
      return ''
    }
  },

  setLastNursery: (nursery) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_NURSERY, nursery)
    } catch {
      console.warn('Could not save nursery to localStorage')
    }
  },

  getKitchenSafetyState: (nursery) => {
    try {
      const history = loadHistory(nursery)
      return history[todayStr()] || null
    } catch {
      return null
    }
  },

  setKitchenSafetyState: (nursery, completedSections, sectionData) => {
    try {
      const history = loadHistory(nursery)
      history[todayStr()] = { completedSections, sectionData }
      // Prune entries older than 30 days
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 31)
      Object.keys(history).forEach(date => {
        if (new Date(date) < cutoff) delete history[date]
      })
      localStorage.setItem(
        `${STORAGE_KEYS.KITCHEN_SAFETY}_${nursery}`,
        JSON.stringify(history)
      )
    } catch {
      console.warn('Could not save kitchen safety state to localStorage')
    }
  },

  getKitchenSafetyHistory: (nursery) => {
    return loadHistory(nursery)
  },

  getCustomRooms: (nursery, checkTypeId) => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEYS.CUSTOM_ROOMS}_${nursery}_${checkTypeId}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  },

  setCustomRooms: (nursery, checkTypeId, rooms) => {
    try {
      localStorage.setItem(
        `${STORAGE_KEYS.CUSTOM_ROOMS}_${nursery}_${checkTypeId}`,
        JSON.stringify(rooms)
      )
    } catch {
      console.warn('Could not save custom rooms to localStorage')
    }
  },

  clearUserData: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_NAME)
    } catch {
      console.warn('Could not clear user data from localStorage')
    }
  },
}
