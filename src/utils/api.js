import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`)
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response received from ${response.config.url}:`, response.status)
    return response
  },
  (error) => {
    console.error('Response error:', error)
    
    if (error.response) {
      // Server responded with error status
      console.error('Error response:', error.response.data)
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request)
    } else {
      // Something else happened
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API functions
export const predictBloodGroup = async (file) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to predict blood group'
    )
  }
}

export const captureAndPredict = async () => {
  try {
    const response = await api.post('/capture-and-predict')
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to capture fingerprint from scanner'
    )
  }
}

export const checkServerHealth = async () => {
  try {
    const response = await api.get('/')
    return response.data
  } catch {
    throw new Error('Server is not responding')
  }
}

// Email functions
export const sendEmail = async (emailData) => {
  try {
    const response = await api.post('/send-email', emailData)
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to send email'
    )
  }
}

// OTP functions
export const sendOtp = async (email) => {
  try {
    const response = await api.post('/send-otp', { email })
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to send OTP'
    )
  }
}

export const verifyOtp = async (email, otp) => {
  try {
    const response = await api.post('/verify-otp', { email, otp })
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.message || 
      error.message || 
      'Failed to verify OTP'
    )
  }
}

// Fingerprint functions
export const enrollFingerprint = async () => {
  try {
    const response = await api.post('/enroll-fingerprint')
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to enroll fingerprint'
    )
  }
}

export const searchFingerprint = async () => {
  try {
    const response = await api.post('/search-fingerprint')
    return response.data
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to search fingerprint'
    )
  }
}

export default api
