import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
}

export const userAPI = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  search: (q) => api.get('/users/search', { params: { q } }),
}

export const groupAPI = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  getDetail: (id) => api.get(`/groups/${id}`),
  invite: (data) => api.post('/groups/invite', data),
  join: (inviteCode) => api.post('/groups/respond', { invite_code: inviteCode, accept: true }),
  leave: (id) => api.delete(`/groups/${id}/leave`),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
<<<<<<< HEAD
  getStats: (id) => api.get(`/groups/${id}/stats`),
=======
  inviteByEmail: (data) => api.post('/groups/invite-by-email', data),
  pendingInvitations: () => api.get('/groups/invitations/pending'),
  respondInvitation: (id, data) => api.put(`/groups/invitations/${id}/respond`, data),
}

// AI接口
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  parse: (data) => api.post('/ai/parse', data),
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
  getAbilityProfile: () => api.get('/users/me/ability-profile'),
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
}

export default api
