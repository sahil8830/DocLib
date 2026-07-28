import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120_000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('contexa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('contexa_token')
      localStorage.removeItem('contexa_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
