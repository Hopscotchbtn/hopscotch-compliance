const STORAGE_KEYS = {
  USER_NAME: 'hopscotch_user_name',
  LAST_NURSERY: 'hopscotch_last_nursery',
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
}
