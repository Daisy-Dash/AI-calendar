import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证接口
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
}

// 任务接口
export const taskAPI = {
  list: (params) => api.get('/tasks', { params }),
  create: (data) => api.post('/tasks', data),
  get: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateProgress: (id, progress) => api.put(`/tasks/${id}/progress`, { progress }),
  exportCSV: () => api.get('/tasks/export/csv', { responseType: 'blob' }),
  split: (data) => api.post('/tasks/split', data),
  assign: (data) => api.post('/tasks/assign', data),
}

// 日程接口
export const scheduleAPI = {
  list: (params) => api.get('/schedule', { params }),
  create: (data) => api.post('/schedule', data),
  update: (id, data) => api.put(`/schedule/${id}`, data),
  delete: (id) => api.delete(`/schedule/${id}`),
  getMonth: (year, month) => api.get('/schedule/month', { params: { year, month } }),
  exportICS: (year, month) => {
    const params = {}
    if (year) params.year = year
    if (month) params.month = month
    return api.get('/schedule/export/download', { params, responseType: 'blob' })
  },
  parse: (text) => api.post('/schedule/parse', { text }),
}

// 群组接口
export const groupAPI = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  get: (id) => api.get(`/groups/${id}`),
  invite: (data) => api.post('/groups/invite', data),
  respond: (data) => api.post('/groups/respond', data),
  stats: (id) => api.get(`/groups/${id}/stats`),
  leave: (id) => api.delete(`/groups/${id}/leave`),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  inviteByEmail: (data) => api.post('/groups/invite-by-email', data),
  pendingInvitations: () => api.get('/groups/invitations/pending'),
  respondInvitation: (id, data) => api.put(`/groups/invitations/${id}/respond`, data),
}

// AI接口
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
}

// 通知接口
export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

// 用户接口
export const userAPI = {
  me: () => api.get('/users/me'),
  update: (data) => api.put('/users/me', data),
  getSettings: () => api.get('/users/me/settings'),
  updateSettings: (data) => api.put('/users/me/settings', data),
  getStats: () => api.get('/users/me/stats'),
}

export default api
