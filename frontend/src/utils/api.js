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
  getSettings: () => api.get('/users/me/settings'),
  updateSettings: (data) => api.put('/users/me/settings', data),
  getStats: () => api.get('/users/me/stats'),
  getAbilityProfile: () => api.get('/users/me/ability-profile'),
  deleteAccount: () => api.delete('/users/me'),
}

export const groupAPI = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  getDetail: (id) => api.get(`/groups/${id}`),
  invite: (data) => api.post('/groups/invite', data),
  join: (inviteCode) => api.post('/groups/respond', { invite_code: inviteCode, accept: true }),
  leave: (id) => api.delete(`/groups/${id}/leave`),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  getStats: (id) => api.get(`/groups/${id}/stats`),
  inviteByEmail: (data) => api.post('/groups/invite-by-email', data),
  pendingInvitations: () => api.get('/groups/invitations/pending'),
  respondInvitation: (id, data) => api.put(`/groups/invitations/${id}/respond`, data),
  startWorkflow: (groupId, data) => api.post(`/groups/${groupId}/start-workflow`, data || {}, { timeout: 120000 }),
  confirmTask: (groupId, taskId, data) => api.post(`/groups/${groupId}/tasks/${taskId}/confirm`, data),
  getPendingTasks: (groupId) => api.get(`/groups/${groupId}/pending-tasks`),
  submitProposal: (groupId, data) => api.post(`/groups/${groupId}/submit-proposal`, data, { timeout: 120000 }),
  askAIAboutFile: (groupId, fileId, data) => api.post(`/groups/${groupId}/knowledge/${fileId}/ask-ai`, data || {}, { timeout: 60000 }),
  getSearchResults: (groupId) => api.get(`/groups/${groupId}/search-results`),
  saveSearchResults: (groupId, results) => api.put(`/groups/${groupId}/search-results`, { results }),
  getAIKnowledge: (groupId) => api.get(`/groups/${groupId}/ai-knowledge`),
  rebuildKnowledge: (groupId) => api.post(`/groups/${groupId}/rebuild-knowledge`, {}, { timeout: 60000 }),
  voteAdjustment: (groupId, messageId, approve) => api.post(`/groups/${groupId}/vote-adjustment/${messageId}`, { approve }),
}

export const taskAPI = {
  list: (params) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateProgress: (id, progress) => api.put(`/tasks/${id}/progress`, { progress }),
  taskChat: (taskId, data) => api.post(`/tasks/${taskId}/chat`, data, { timeout: 120000 }),
  uploadProof: (taskId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/tasks/${taskId}/upload-proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },
  splitTask: (taskId, data) => api.post(`/tasks/${taskId}/split`, data || {}, { timeout: 60000 }),
}

export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data, { timeout: 60000 }),
  parse: (data) => api.post('/ai/parse', data),
  searchChat: (data) => api.post('/ai/search-chat', data, { timeout: 120000 }),
}

export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export const friendAPI = {
  search: (q) => api.get('/friends/search', { params: { q } }),
  list: () => api.get('/friends'),
  sendRequest: (friendId) => api.post('/friends/request', { friend_id: friendId }),
  getRequests: () => api.get('/friends/requests'),
  respondRequest: (id, accept) => api.put(`/friends/requests/${id}`, { accept }),
  remove: (friendId) => api.delete(`/friends/${friendId}`),
}

export const messageAPI = {
  getGroupMessages: (groupId, params) => api.get(`/messages/group/${groupId}`, { params }),
  sendGroupMessage: (groupId, data) => api.post(`/messages/group/${groupId}`, data, { timeout: 120000 }),
  getPrivateMessages: (params) => api.get('/messages/private', { params }),
  sendPrivateMessage: (data) => api.post('/messages/private', data, { timeout: 60000 }),
  getKnowledgeFiles: (groupId) => api.get(`/messages/knowledge/${groupId}`),
  uploadKnowledgeFile: (groupId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/messages/knowledge/${groupId}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },
}

export const uploadAPI = {
  uploadFile: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/upload/file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    })
  },
  uploadFiles: (files) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return api.post('/upload/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },
}

export default api
