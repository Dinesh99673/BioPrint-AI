import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Heart } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { useAuth } from '../../hooks/useAuth'
import { auth } from '../../firebase/config'
import FormInput from '../../components/FormInput'
import toast from 'react-hot-toast'

const HospitalLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState('')
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    try {
      await login(formData.email, formData.password, 'hospital')
      toast.success('Login successful!')
      navigate('/hospital/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const getResetPasswordError = (error) => {
    switch (error?.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.'
      case 'auth/user-not-found':
        return 'No account was found with this email address.'
      case 'auth/missing-email':
        return 'Email is required to reset password.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.'
      default:
        return 'Failed to send reset email. Please try again.'
    }
  }

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true)
    setResetError('')
    setResetEmail(formData.email || '')
  }

  const handleSendResetEmail = async () => {
    const emailToReset = resetEmail.trim()
    if (!emailToReset) {
      setResetError('Email is required')
      return
    }
    if (!/\S+@\S+\.\S+/.test(emailToReset)) {
      setResetError('Please enter a valid email address')
      return
    }

    setResetLoading(true)
    setResetError('')
    try {
      await sendPasswordResetEmail(auth, emailToReset)
      toast.success('Password reset email sent. Please check your inbox.')
      setShowForgotPassword(false)
      setResetEmail('')
    } catch (error) {
      console.error('Reset password error:', error)
      setResetError(getResetPasswordError(error))
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Heart className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Hospital Login</h1>
          <p className="text-gray-600">Access your hospital dashboard</p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="hospital@example.com"
              error={errors.email}
              required
            />

            <FormInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              error={errors.password}
              required
            />

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {showForgotPassword && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Reset Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value)
                    if (resetError) setResetError('')
                  }}
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {resetError && (
                  <p className="text-sm text-red-500">{resetError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={resetLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetError('')
                    }}
                    disabled={resetLoading}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-4">
            <div className="flex items-center justify-center space-x-4 text-sm">
              <Link 
                to="/admin-login" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Admin Login
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                to="/hospital-register" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Register Hospital
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                to="/" 
                className="text-gray-600 hover:text-gray-700"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-gray-500 text-sm"
        >
          <p>© 2024 BioPrint AI. All rights reserved.</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default HospitalLogin
