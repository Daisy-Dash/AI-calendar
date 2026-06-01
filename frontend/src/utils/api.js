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
  split: (data) => api.post('/tasks/split', data),
  assign: (data) => api.post('/tasks/assign', data),
}

// 日程接口
export const scheduleAPI = {
  list: (params) => api.get('/schedule', { params }),
  create: (data) => api.post('/schedule', data),
  parse: (text) => api.post('/schedule/parse', { text }),
}

// 群组接口
export const groupAPI = {
  create: (data) => api.post('/groups', data),
  invite: (data) => api.post('/groups/invite', data),
  respond: (data) => api.post('/groups/respond', data),
  stats: (id) => api.get(`/groups/${id}/stats`),
}

// AI接口
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
}

// 用户接口
export const userAPI = {
  me: () => api.get('/users/me'),
  update: (data) => api.put('/users/me', data),
}

export default api
