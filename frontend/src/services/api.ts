import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/chalv/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const loginApi = (data: { username: string; password: string }) =>
  api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')

// SOP
export const getSopFolders = (tripFilter = '全部') =>
  api.get('/sop/folders', { params: { trip_filter: tripFilter } })
export const createSopFolder = (data: any) => api.post('/sop/folders', data)
export const deleteSopFolder = (id: number) => api.delete(`/sop/folders/${id}`)
export const getSopDocuments = (folderId?: number, tripFilter = '全部') =>
  api.get('/sop/documents', { params: { folder_id: folderId, trip_filter: tripFilter } })
export const getSopDocument = (id: number) => api.get(`/sop/documents/${id}`)
export const createSopDocument = (data: any) => api.post('/sop/documents', data)
export const updateSopDocument = (id: number, data: any) => api.put(`/sop/documents/${id}`, data)
export const toggleSopStep = (docId: number, stepOrder: number) =>
  api.put(`/sop/documents/${docId}/toggle-step/${stepOrder}`)
export const deleteSopDocument = (id: number) => api.delete(`/sop/documents/${id}`)
export const getSopStats = () => api.get('/sop/stats')

// Tasks
export const getTasks = (taskDate?: string, tripFilter = '全部') =>
  api.get('/tasks', { params: { task_date: taskDate, trip_filter: tripFilter } })
export const createTask = (data: any) => api.post('/tasks', data)
export const toggleTask = (id: number, toggleDate?: string) =>
  api.post(`/tasks/${id}/toggle`, null, { params: { toggle_date: toggleDate } })
export const deleteTask = (id: number) => api.delete(`/tasks/${id}`)
export const aiImportTasksPreview = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/tasks/ai-import-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const aiImportTasksConfirm = (data: { tasks: any[] }) =>
  api.post('/tasks/ai-import-confirm', data)

// Documents
export const getDocumentFiles = (folderName?: string, tripFilter = '全部') =>
  api.get('/documents', { params: { folder_name: folderName, trip_filter: tripFilter } })
export const uploadDocument = (formData: FormData) =>
  api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteDocumentFile = (id: number) => api.delete(`/documents/${id}`)

// Checklist
export const getChecklistItems = (template?: string, filterType = '全部', tripDate?: string) =>
  api.get('/checklist', { params: { template, filter_type: filterType, trip_date: tripDate || undefined } })
export const createChecklistItem = (data: any) => api.post('/checklist', data)
export const updateChecklistItem = (id: number, data: any) => api.put(`/checklist/${id}`, data)
export const toggleChecklistItem = (id: number) => api.put(`/checklist/${id}/toggle`)
export const deleteChecklistItem = (id: number) => api.delete(`/checklist/${id}`)
export const reorderChecklistItems = (items: { id: number; sort_order: number }[]) =>
  api.put('/checklist/reorder', { items })

// Checklist AI Import
export const aiImportPreview = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/checklist/ai-import-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const aiImportConfirm = (data: {
  items: { name: string; category: string; extras: string }[]
  checklist_template: string
  trip_id?: number
}) => api.post('/checklist/ai-import-confirm', data)

// AI
export const aiAsk = (question: string) => api.post('/ai/ask', { question })

// Trips
export const getTrips = (template?: string) =>
  api.get('/trips', { params: { template } })
export const createTrip = (data: any) => api.post('/trips', data)
export const deleteTrip = (id: number) => api.delete(`/trips/${id}`)
export const getTripItems = (tripId: number, filterType = 'all', pool?: string) =>
  api.get(`/trips/${tripId}/items`, { params: { filter_type: filterType, pool } })
export const toggleTripItem = (tripId: number, itemId: number) =>
  api.post(`/trips/${tripId}/items/${itemId}/toggle`)

