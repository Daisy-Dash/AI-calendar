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
  getStats: (id) => api.get(`/groups/${id}/stats`),
}

export default api
