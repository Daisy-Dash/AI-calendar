export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  if (days < 0) return `已超期 ${Math.abs(days)} 天`
  if (days === 0) return '今天截止'
  if (days === 1) return '明天截止'
  if (days <= 7) return `${days}天后截止`
  return `${month}/${day}`
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 4: return { bg: '#FFF0F0', text: '#F44336', label: '紧急' }
    case 3: return { bg: '#FFF3E0', text: '#FF9800', label: '高' }
    case 2: return { bg: '#E3F2FD', text: '#2196F3', label: '中' }
    default: return { bg: '#F5F5F5', text: '#9E9E9E', label: '低' }
  }
}

export function getStatusColor(status) {
  switch (status) {
    case '已完成': return { bg: '#E8F5E9', text: '#4CAF50' }
    case '进行中': return { bg: '#FFF3E0', text: '#FF9800' }
    default: return { bg: '#F5F5F5', text: '#9E9E9E' }
  }
}

export function getWeekDates() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一开始
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)

  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    weekDates.push(date)
  }
  return weekDates
}

export function getDaysUntilDeadline(deadline) {
  if (!deadline) return null
  const now = new Date()
  const ddl = new Date(deadline)
  return Math.ceil((ddl - now) / (1000 * 60 * 60 * 24))
}
