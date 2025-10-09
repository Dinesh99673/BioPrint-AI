import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Heart, MapPin, Phone, Mail, Globe, FileText } from 'lucide-react'
import FormInput from '../../components/FormInput'
import toast from 'react-hot-toast'
import axios from 'axios'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'

const RegisterHospital = () => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    hospitalRegistrationNumber: '',
    location: '',
    websiteUrl: '',
    email: '',
    phoneNumber: '',
    alternativePhoneNumber: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  
  const navigate = useNavigate()
  const { createLog } = useAuth()

  const hospitalTypes = [
    'Government',
    'Private',
    'Clinic',
    'Trust',
    'NGO',
    'Other'
  ]

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
    
    if (!formData.name.trim()) {
      newErrors.name = 'Hospital name is required'
    }
    
    if (!formData.type) {
      newErrors.type = 'Hospital type is required'
    }
    
    if (!formData.hospitalRegistrationNumber.trim()) {
      newErrors.hospitalRegistrationNumber = 'Registration number is required'
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Phone number must be 10 digits'
    }
    
    if (formData.websiteUrl && !/^https?:\/\/.+/.test(formData.websiteUrl)) {
      newErrors.websiteUrl = 'Website URL must start with http:// or https://'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    try {
      // Generate unique hospital ID
      const hospitalId = `HOSP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Prepare hospital data according to the specified structure
      const hospitalData = {
        hospitalId,
        name: formData.name.trim(),
        type: formData.type,
        hospitalRegistrationNumber: formData.hospitalRegistrationNumber.trim(),
        verification_status: 'Pending', // Default status
        location: formData.location.trim(),
        websiteUrl: formData.websiteUrl.trim() || null,
        allowedHospitals: [], // Empty array initially
        isDisabled: true, // Disabled until verified
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        alternativePhoneNumber: formData.alternativePhoneNumber.trim() || null,
        createdAt: new Date().toISOString()
      }
      
      // Save to Firestore hospital collection
      const docRef = await addDoc(collection(db, 'hospital'), hospitalData)
      
      // Create log entry for the registration
      await createLog({
        hospitalId,
        action: 'REGISTER_HOSPITAL',
        remarks: `New hospital registered: ${formData.name} (${formData.type})`
      })
      
      // Send notification email to admin about new registration
      try {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-email`, {
          to: formData.email, // Send to hospital email
          subject: 'Hospital Registration Submitted - BioPrint AI',
          body: `
Dear ${formData.name} Team,

Your hospital registration has been successfully submitted to BioPrint AI system.

Registration Details:
- Hospital Name: ${formData.name}
- Type: ${formData.type}
- Registration Number: ${formData.hospitalRegistrationNumber}
- Location: ${formData.location}
- Email: ${formData.email}

Your registration is currently under review. You will receive another email once your registration is approved or rejected.

If you have any questions, please contact our support team.

Best regards,
BioPrint AI Team
          `
        })
      } catch (emailError) {
        console.warn('Failed to send registration email:', emailError)
        // Don't fail the registration if email fails
      }
      
      toast.success('Hospital registered successfully! Registration is pending approval.')
      navigate('/admin/dashboard')
      
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Failed to register hospital. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Heart className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Register New Hospital</h1>
            <p className="text-gray-600">Add a new hospital to the BioPrint AI system</p>
          </div>

          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Hospital Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter hospital name"
                  error={errors.name}
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hospital Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.type
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    } bg-white`}
                  >
                    <option value="">Select hospital type</option>
                    {hospitalTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.type && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-red-600"
                    >
                      {errors.type}
                    </motion.p>
                  )}
                </div>
              </div>

              <FormInput
                label="Hospital Registration Number"
                name="hospitalRegistrationNumber"
                value={formData.hospitalRegistrationNumber}
                onChange={handleChange}
                placeholder="Enter registration number"
                error={errors.hospitalRegistrationNumber}
                required
              />

              <FormInput
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter hospital address"
                error={errors.location}
                required
              />

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  label="Phone Number"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter 10-digit phone number"
                  error={errors.phoneNumber}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Alternative Phone Number"
                  name="alternativePhoneNumber"
                  value={formData.alternativePhoneNumber}
                  onChange={handleChange}
                  placeholder="Enter alternative phone number"
                  error={errors.alternativePhoneNumber}
                />

                <FormInput
                  label="Website URL"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  placeholder="https://hospital-website.com"
                  error={errors.websiteUrl}
                />
              </div>

              {/* Submit Button */}
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
                    <span>Registering Hospital...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    <span>Register Hospital</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              <Link 
                to="/admin/dashboard"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                ← Back to Admin Dashboard
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default RegisterHospital
