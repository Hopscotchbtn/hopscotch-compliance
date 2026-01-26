export const formatDate = (date = new Date()) => {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const formatShortDate = (date = new Date()) => {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const isMonday = () => {
  return new Date().getDay() === 1
}

export const getDayName = () => {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long' })
}
