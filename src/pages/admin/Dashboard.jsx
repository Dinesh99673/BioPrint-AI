import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Plus,
  Eye,
  Ban,
  Check
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from '../../components/Sidebar'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import FormInput from '../../components/FormInput'
import toast from 'react-hot-toast'
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import axios from 'axios'
import { generateSecurePassword } from '../../utils/passwordGenerator'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [hospitals, setHospitals] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [registerForm, setRegisterForm] = useState({
    name: '',
    type: '',
    hospitalRegistrationNumber: '',
    location: '',
    websiteUrl: '',
    email: '',
    phoneNumber: '',
    alternativePhoneNumber: ''
  })
  const [registerErrors, setRegisterErrors] = useState({})
  const [isRegistering, setIsRegistering] = useState(false)
  
  const { userData, createLog } = useAuth()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch hospitals
      const hospitalsSnapshot = await getDocs(collection(db, 'hospital'))
      const hospitalsData = hospitalsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setHospitals(hospitalsData)

      // Fetch logs
      const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'))
      const logsSnapshot = await getDocs(logsQuery)
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setLogs(logsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const handleHospitalAction = async (hospital, action, rejectionReason = '') => {
    try {
      if (action === 'approve') {
        // Generate secure password
        const generatedPassword = generateSecurePassword()
        
        try {
          // Create Firebase Authentication account
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            hospital.email, 
            generatedPassword
          )
          
          // Create a new document with Firebase UID as the document ID
          // This ensures the document ID matches the Firebase Auth UID
          await setDoc(doc(db, 'hospital', userCredential.user.uid), {
            ...hospital, // Include all existing hospital data
            verification_status: 'Verified',
            isDisabled: false, // Enable hospital after approval
            firebaseUid: userCredential.user.uid, // Store Firebase UID for reference
            generatedPassword: generatedPassword, // Store password temporarily
            passwordGeneratedAt: new Date().toISOString()
          })
          
          // Delete the old document with auto-generated ID
          await deleteDoc(doc(db, 'hospital', hospital.id))

          // Send approval email via FastAPI with login credentials
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-email`, {
            to: hospital.email,
            subject: 'Hospital Registration Approved - BioPrint AI',
            body: `
Dear ${hospital.name} Team,

Congratulations! Your hospital registration has been approved.

Hospital Details:
- Hospital Name: ${hospital.name}
- Type: ${hospital.type}
- Registration Number: ${hospital.hospitalRegistrationNumber}
- Location: ${hospital.location}

Your hospital account is now active and you can access the BioPrint AI system.

Login Credentials:
- Email: ${hospital.email}
- Password: ${generatedPassword}

IMPORTANT SECURITY NOTES:
- Please change your password after first login
- Keep your login credentials secure
- Do not share your password with unauthorized personnel

Next Steps:
1. Log in to the hospital dashboard using the credentials above
2. Change your password immediately after first login
3. Start adding patient records
4. Access the fingerprint blood group prediction system

Login URL: ${window.location.origin}/hospital-login

If you have any questions or need assistance, please contact our support team.

Best regards,
BioPrint AI Team
            `
          })

          // Create log entry
          await createLog({
            hospitalId: userCredential.user.uid,
            action: 'APPROVE_HOSPITAL',
            remarks: `Approved hospital registration for ${hospital.name} - Firebase account created and enabled`
          })

          toast.success('Hospital approved, Firebase account created, and enabled successfully!')
          
        } catch (firebaseError) {
          console.error('Firebase account creation failed:', firebaseError)
          
          // If Firebase account creation fails, still update the status but don't enable
          await updateDoc(doc(db, 'hospital', hospital.id), {
            verification_status: 'Verified',
            isDisabled: true, // Keep disabled if Firebase account creation failed
            firebaseError: firebaseError.message
          })
          
          // Send email about manual account creation needed
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-email`, {
            to: hospital.email,
            subject: 'Hospital Registration Approved - Manual Setup Required - BioPrint AI',
            body: `
Dear ${hospital.name} Team,

Your hospital registration has been approved, but there was an issue creating your login account.

Hospital Details:
- Hospital Name: ${hospital.name}
- Type: ${hospital.type}
- Registration Number: ${hospital.hospitalRegistrationNumber}
- Location: ${hospital.location}

Status: APPROVED (Manual account setup required)

Our technical team will contact you within 24 hours to complete your account setup and provide login credentials.

If you have any questions, please contact our support team immediately.

Best regards,
BioPrint AI Team
            `
          })
          
          toast.error('Hospital approved but Firebase account creation failed. Manual setup required.')
        }
      } else if (action === 'reject') {
        // Update hospital status
        await updateDoc(doc(db, 'hospital', hospital.id), {
          verification_status: 'Rejected',
          isDisabled: true // Keep disabled when rejected
        })

        // Send rejection email via FastAPI with reason
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-email`, {
          to: hospital.email,
          subject: 'Hospital Registration Rejected - BioPrint AI',
          body: `
Dear ${hospital.name} Team,

We regret to inform you that your hospital registration has been rejected.

Hospital Details:
- Hospital Name: ${hospital.name}
- Type: ${hospital.type}
- Registration Number: ${hospital.hospitalRegistrationNumber}

Rejection Reason:
${rejectionReason || 'Please contact our support team for more information about the rejection reason.'}

Next Steps:
1. Please review the rejection reason above
2. If you believe this is an error, you may reapply with corrected information
3. For any questions, please contact our support team

We appreciate your interest in BioPrint AI and encourage you to reapply once the issues are resolved.

Best regards,
BioPrint AI Team
          `
        })

        // Create log entry
        await createLog({
          hospitalId: hospital.hospitalId || hospital.id,
          action: 'REJECT_HOSPITAL',
          remarks: `Rejected hospital registration for ${hospital.name} - Reason: ${rejectionReason || 'No reason provided'}`
        })

        toast.success('Hospital rejected successfully!')
      } else if (action === 'toggle') {
        // Toggle hospital enabled/disabled status (only for verified hospitals)
        if (hospital.verification_status !== 'Verified') {
          toast.error('Only verified hospitals can be enabled/disabled')
          return
        }

        const newStatus = hospital.isDisabled ? false : true
        await updateDoc(doc(db, 'hospital', hospital.id), {
          isDisabled: newStatus
        })

        // Send notification email about status change
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-email`, {
          to: hospital.email,
          subject: `Hospital Account ${newStatus ? 'Disabled' : 'Enabled'} - BioPrint AI`,
          body: `
Dear ${hospital.name} Team,

Your hospital account has been ${newStatus ? 'disabled' : 'enabled'}.

Hospital Details:
- Hospital Name: ${hospital.name}
- Status: ${newStatus ? 'Disabled' : 'Enabled'}

${newStatus ? 
  'Your account is temporarily disabled. Please contact support for more information.' :
  'Your account is now active and you can access all features.'
}

If you have any questions, please contact our support team.

Best regards,
BioPrint AI Team
          `
        })

        // Create log entry
        await createLog({
          hospitalId: hospital.hospitalId || hospital.id,
          action: newStatus ? 'DISABLE_HOSPITAL' : 'ENABLE_HOSPITAL',
          remarks: `${newStatus ? 'Disabled' : 'Enabled'} hospital ${hospital.name}`
        })

        toast.success(`Hospital ${newStatus ? 'disabled' : 'enabled'} successfully!`)
      }

      // Refresh data
      fetchData()
    } catch (error) {
      console.error('Error updating hospital:', error)
      toast.error('Failed to update hospital')
    }
  }

  const handleRejectHospital = (hospital) => {
    setSelectedHospital(hospital)
    setRejectionReason('')
    setModalType('reject')
    setShowModal(true)
  }

  const confirmRejection = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    
    await handleHospitalAction(selectedHospital, 'reject', rejectionReason.trim())
    setShowModal(false)
    setRejectionReason('')
    setSelectedHospital(null)
  }

  const validateRegisterForm = () => {
    const newErrors = {}
    
    if (!registerForm.name.trim()) {
      newErrors.name = 'Hospital name is required'
    }
    
    if (!registerForm.type) {
      newErrors.type = 'Hospital type is required'
    }
    
    if (!registerForm.hospitalRegistrationNumber.trim()) {
      newErrors.hospitalRegistrationNumber = 'Registration number is required'
    }
    
    if (!registerForm.location.trim()) {
      newErrors.location = 'Location is required'
    }
    
    if (!registerForm.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(registerForm.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!registerForm.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!/^\d{10}$/.test(registerForm.phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Phone number must be 10 digits'
    }
    
    if (registerForm.websiteUrl && !/^https?:\/\/.+/.test(registerForm.websiteUrl)) {
      newErrors.websiteUrl = 'Website URL must start with http:// or https://'
    }
    
    setRegisterErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegisterHospital = async (e) => {
    e.preventDefault()
    
    if (!validateRegisterForm()) return
    
    setIsRegistering(true)
    try {
      // Generate secure password
      const generatedPassword = generateSecurePassword()
      
      // Generate unique hospital ID
      const hospitalId = `HOSP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Prepare hospital data
      const hospitalData = {
        hospitalId,
        name: registerForm.name.trim(),
        type: registerForm.type,
        hospitalRegistrationNumber: registerForm.hospitalRegistrationNumber.trim(),
        verification_status: 'Verified', // Auto-verified since admin is registering
        location: registerForm.location.trim(),
        websiteUrl: registerForm.websiteUrl.trim() || null,
        allowedHospitals: [],
        isDisabled: false, // Enabled immediately
        email: registerForm.email.trim(),
        phoneNumber: registerForm.phoneNumber.trim(),
        alternativePhoneNumber: registerForm.alternativePhoneNumber.trim() || null,
        createdAt: new Date().toISOString()
      }
      
      try {
        // Create Firebase Authentication account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          registerForm.email.trim(),
          generatedPassword
        )
        
        // Create document with Firebase UID as document ID
        await setDoc(doc(db, 'hospital', userCredential.user.uid), {
          ...hospitalData,
          firebaseUid: userCredential.user.uid,
          generatedPassword: generatedPassword,
          passwordGeneratedAt: new Date().toISOString()
        })
        
        // Send credentials email
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-email`, {
          to: registerForm.email.trim(),
          subject: 'Hospital Registration - BioPrint AI - Welcome!',
          body: `
Dear ${registerForm.name.trim()} Team,

Welcome to BioPrint AI! Your hospital has been successfully registered by the system administrator.

Hospital Details:
- Hospital Name: ${registerForm.name.trim()}
- Type: ${registerForm.type}
- Registration Number: ${registerForm.hospitalRegistrationNumber.trim()}
- Location: ${registerForm.location.trim()}
- Email: ${registerForm.email.trim()}

Your hospital account is now active and verified. You can access the BioPrint AI system immediately.

Login Credentials:
- Email: ${registerForm.email.trim()}
- Password: ${generatedPassword}

IMPORTANT SECURITY NOTES:
- Please change your password after first login
- Keep your login credentials secure
- Do not share your password with unauthorized personnel

Next Steps:
1. Log in to the hospital dashboard using the credentials above
2. Change your password immediately after first login
3. Start adding patient records
4. Access the fingerprint blood group prediction system

Login URL: ${window.location.origin}/hospital-login

If you have any questions or need assistance, please contact our support team.

Best regards,
BioPrint AI Team
          `
        })
        
        // Create log entry
        await createLog({
          hospitalId: userCredential.user.uid,
          action: 'ADMIN_REGISTER_HOSPITAL',
          remarks: `Admin registered and verified hospital: ${registerForm.name.trim()} - Firebase account created and enabled`
        })
        
        toast.success('Hospital registered, verified, and credentials sent successfully!')
        
        // Reset form
        setRegisterForm({
          name: '',
          type: '',
          hospitalRegistrationNumber: '',
          location: '',
          websiteUrl: '',
          email: '',
          phoneNumber: '',
          alternativePhoneNumber: ''
        })
        setRegisterErrors({})
        
        // Refresh data
        await fetchData()
        
        // Switch to hospitals tab to see the new hospital
        setActiveTab('hospitals')
        
      } catch (firebaseError) {
        console.error('Firebase account creation failed:', firebaseError)
        toast.error('Failed to create hospital account. Please try again.')
      }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('Failed to register hospital. Please try again.')
    } finally {
      setIsRegistering(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      'Verified': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'Rejected': { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const config = statusConfig[status] || statusConfig['Pending']
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        <span>{status}</span>
      </span>
    )
  }

  const hospitalColumns = [
    {
      header: 'Hospital Name',
      key: 'name',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.type}</div>
        </div>
      )
    },
    {
      header: 'Email',
      key: 'email'
    },
    {
      header: 'Location',
      key: 'location'
    },
    {
      header: 'Status',
      key: 'verification_status',
      render: (value, row) => (
        <div className="space-y-1">
          {getStatusBadge(value)}
          {row.isDisabled && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Disabled
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          {row.verification_status === 'Pending' && (
            <>
              <button
                onClick={() => handleHospitalAction(row, 'approve')}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleRejectHospital(row)}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleHospitalAction(row, 'toggle')}
            className={`p-1 rounded ${
              row.isDisabled 
                ? 'text-green-600 hover:bg-green-100' 
                : 'text-red-600 hover:bg-red-100'
            }`}
            title={row.isDisabled ? 'Enable' : 'Disable'}
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const logColumns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      render: (value) => new Date(value).toLocaleString()
    },
    {
      header: 'Action',
      key: 'action'
    },
    {
      header: 'Hospital ID',
      key: 'hospitalId'
    },
    {
      header: 'Patient ID',
      key: 'patientId',
      render: (value) => value || '-'
    },
    {
      header: 'Remarks',
      key: 'remarks'
    }
  ]

  const stats = [
    {
      title: 'Total Hospitals',
      value: hospitals.length,
      icon: Building2,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Pending Requests',
      value: hospitals.filter(h => h.verification_status === 'Pending').length,
      icon: AlertCircle,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'Verified Hospitals',
      value: hospitals.filter(h => h.verification_status === 'Verified').length,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Disabled Hospitals',
      value: hospitals.filter(h => h.isDisabled).length,
      icon: Ban,
      color: 'from-red-500 to-red-600'
    }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {logs.slice(0, 5).map((log, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{log.remarks}</p>
                <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderRegisterHospital = () => {
    const hospitalTypes = [
      'Government',
      'Private',
      'Clinic',
      'Trust',
      'NGO',
      'Other'
    ]

    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Register New Hospital</h3>
          <p className="text-gray-600">Register a new hospital. The hospital will be automatically verified and credentials will be sent via email.</p>
        </div>

        <form onSubmit={handleRegisterHospital} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Hospital Name"
              name="name"
              value={registerForm.name}
              onChange={(e) => {
                setRegisterForm({...registerForm, name: e.target.value})
                if (registerErrors.name) setRegisterErrors({...registerErrors, name: ''})
              }}
              placeholder="Enter hospital name"
              error={registerErrors.name}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Hospital Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={registerForm.type}
                onChange={(e) => {
                  setRegisterForm({...registerForm, type: e.target.value})
                  if (registerErrors.type) setRegisterErrors({...registerErrors, type: ''})
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  registerErrors.type
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                } bg-white`}
              >
                <option value="">Select hospital type</option>
                {hospitalTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {registerErrors.type && (
                <p className="text-sm text-red-600">{registerErrors.type}</p>
              )}
            </div>
          </div>

          <FormInput
            label="Hospital Registration Number"
            name="hospitalRegistrationNumber"
            value={registerForm.hospitalRegistrationNumber}
            onChange={(e) => {
              setRegisterForm({...registerForm, hospitalRegistrationNumber: e.target.value})
              if (registerErrors.hospitalRegistrationNumber) setRegisterErrors({...registerErrors, hospitalRegistrationNumber: ''})
            }}
            placeholder="Enter registration number"
            error={registerErrors.hospitalRegistrationNumber}
            required
          />

          <FormInput
            label="Location"
            name="location"
            value={registerForm.location}
            onChange={(e) => {
              setRegisterForm({...registerForm, location: e.target.value})
              if (registerErrors.location) setRegisterErrors({...registerErrors, location: ''})
            }}
            placeholder="Enter hospital address"
            error={registerErrors.location}
            required
          />

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Email Address"
              type="email"
              name="email"
              value={registerForm.email}
              onChange={(e) => {
                setRegisterForm({...registerForm, email: e.target.value})
                if (registerErrors.email) setRegisterErrors({...registerErrors, email: ''})
              }}
              placeholder="hospital@example.com"
              error={registerErrors.email}
              required
            />

            <FormInput
              label="Phone Number"
              name="phoneNumber"
              value={registerForm.phoneNumber}
              onChange={(e) => {
                setRegisterForm({...registerForm, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})
                if (registerErrors.phoneNumber) setRegisterErrors({...registerErrors, phoneNumber: ''})
              }}
              placeholder="Enter 10-digit phone number"
              error={registerErrors.phoneNumber}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Alternative Phone Number"
              name="alternativePhoneNumber"
              value={registerForm.alternativePhoneNumber}
              onChange={(e) => {
                setRegisterForm({...registerForm, alternativePhoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)})
              }}
              placeholder="Enter alternative phone number"
            />

            <FormInput
              label="Website URL"
              name="websiteUrl"
              value={registerForm.websiteUrl}
              onChange={(e) => {
                setRegisterForm({...registerForm, websiteUrl: e.target.value})
                if (registerErrors.websiteUrl) setRegisterErrors({...registerErrors, websiteUrl: ''})
              }}
              placeholder="https://hospital-website.com"
              error={registerErrors.websiteUrl}
            />
          </div>

          {/* Submit Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The hospital will be automatically verified and login credentials will be sent to the provided email address.
            </p>
          </div>

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isRegistering ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Registering...</span>
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                <span>Register & Verify Hospital</span>
              </>
            )}
          </button>
        </form>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'hospitals':
        return (
          <Table
            data={hospitals}
            columns={hospitalColumns}
            loading={loading}
            emptyMessage="No hospitals found"
          />
        )
      case 'register':
        return renderRegisterHospital()
      case 'logs':
        return (
          <Table
            data={logs}
            columns={logColumns}
            loading={loading}
            emptyMessage="No logs found"
          />
        )
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="admin" />
      
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage hospitals and monitor system activity</p>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={showModal && modalType === 'reject'}
        onClose={() => {
          setShowModal(false)
          setRejectionReason('')
          setSelectedHospital(null)
        }}
        title="Reject Hospital Registration"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-800">Reject Hospital Registration</h3>
            </div>
            <p className="text-red-700 text-sm">
              You are about to reject the registration for <strong>{selectedHospital?.name}</strong>.
              Please provide a reason for rejection.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a detailed reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowModal(false)
                setRejectionReason('')
                setSelectedHospital(null)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmRejection}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reject Registration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AdminDashboard
