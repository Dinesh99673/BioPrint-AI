import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Shield, 
  AlertTriangle, 
  Settings,
  Eye,
  Edit,
  Trash2,
  Search,
  Phone,
  Mail
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from '../../components/Sidebar'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import FormInput from '../../components/FormInput'
import toast from 'react-hot-toast'
import { collection, getDocs, doc, setDoc, updateDoc, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'
import axios from 'axios'
import { updatePassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { cleanupGeneratedPassword, isUsingGeneratedPassword, validatePassword } from '../../utils/hospitalAuth'

const HospitalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [accessForm, setAccessForm] = useState({ aadharNumber: '', email: '' })
  const [emergencyForm, setEmergencyForm] = useState({ aadharNumber: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  
  const { userData, createLog } = useAuth()

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async () => {
    setLoading(true)
    try {
      const patientsQuery = query(
        collection(db, 'patient'),
        where('addedBy', '==', userData?.hospitalId || ''),
        orderBy('createdAt', 'desc')
      )
      const patientsSnapshot = await getDocs(patientsQuery)
      const patientsData = patientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPatients(patientsData)
    } catch (error) {
      console.error('Error fetching patients:', error)
      toast.error('Failed to fetch patients')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPatient = async (patientData) => {
    try {
      const patientId = Date.now().toString()
      const newPatient = {
        patientId,
        addedBy: userData.hospitalId,
        ...patientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(doc(db, 'patient', patientId), newPatient)
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId,
        action: 'ADD_PATIENT',
        remarks: `Added new patient: ${patientData.aadharNumber}`
      })

      toast.success('Patient added successfully!')
      setShowModal(false)
      fetchPatients()
    } catch (error) {
      console.error('Error adding patient:', error)
      toast.error('Failed to add patient')
    }
  }

  const handleAccessPatient = async (formData) => {
    try {
      // Send OTP via FastAPI
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/send-otp`, {
        email: formData.email
      })

      if (response.data.success) {
        toast.success('OTP sent to patient email!')
        
        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          action: 'SEND_OTP',
          remarks: `Sent OTP to patient: ${formData.aadharNumber}`
        })
      } else {
        throw new Error(response.data.message || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('Error sending OTP:', error)
      toast.error('Failed to send OTP. Please try again.')
    }
  }

  const handleEmergencyOverride = async (formData) => {
    try {
      // Find patient by Aadhaar or email
      const patientsQuery = query(
        collection(db, 'patient'),
        where('aadharNumber', '==', formData.aadharNumber)
      )
      const patientsSnapshot = await getDocs(patientsQuery)
      
      if (patientsSnapshot.empty) {
        toast.error('Patient not found')
        return
      }

      const patient = patientsSnapshot.docs[0].data()
      
      // Create log entry for emergency override
      await createLog({
        hospitalId: userData.hospitalId,
        patientId: patient.patientId,
        action: 'EMERGENCY_OVERRIDE',
        remarks: `Emergency access to patient: ${formData.aadharNumber}`
      })

      // Show patient data (in a real app, you'd show this in a modal or new page)
      toast.success('Emergency access granted!')
      setShowModal(false)
    } catch (error) {
      console.error('Error in emergency override:', error)
      toast.error('Failed to access patient data')
    }
  }

  const handlePasswordChange = async () => {
    try {
      // Validate password
      const validation = validatePassword(passwordForm.newPassword)
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '))
        return
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match')
        return
      }

      // Update password in Firebase Auth
      const user = auth.currentUser
      if (!user) {
        toast.error('User not authenticated')
        return
      }

      await updatePassword(user, passwordForm.newPassword)

      // Clean up generated password from Firestore
      await cleanupGeneratedPassword(user.uid)

      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId || user.uid,
        action: 'CHANGE_PASSWORD',
        remarks: 'Hospital changed password successfully'
      })

      toast.success('Password changed successfully!')
      setShowPasswordModal(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })

    } catch (error) {
      console.error('Password change error:', error)
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log in again before changing your password')
      } else {
        toast.error('Failed to change password. Please try again.')
      }
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.aadharNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.bloodGroup?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const patientColumns = [
    {
      header: 'Aadhaar Number',
      key: 'aadharNumber'
    },
    {
      header: 'Email',
      key: 'email'
    },
    {
      header: 'Blood Group',
      key: 'bloodGroup',
      render: (value) => (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          {value}
        </span>
      )
    },
    {
      header: 'Mobile',
      key: 'mobileNumber'
    },
    {
      header: 'Added Date',
      key: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedPatient(row)
              setModalType('view')
              setShowModal(true)
            }}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPatient(row)
              setModalType('edit')
              setShowModal(true)
            }}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const stats = [
    {
      title: 'Total Patients',
      value: patients.length,
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Emergency Overrides',
      value: 0, // This would be calculated from logs
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Recent Additions',
      value: patients.filter(p => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(p.createdAt) > weekAgo
      }).length,
      icon: UserPlus,
      color: 'from-green-500 to-green-600'
    }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* Recent Patients */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Patients</h3>
        <div className="space-y-3">
          {patients.slice(0, 5).map((patient, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">{patient.aadharNumber}</p>
                <p className="text-sm text-gray-500">{patient.email}</p>
              </div>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                {patient.bloodGroup}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAddPatient = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Add New Patient</h3>
      <form onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const patientData = {
          aadharNumber: formData.get('aadharNumber'),
          email: formData.get('email'),
          mobileNumber: formData.get('mobileNumber'),
          bloodGroup: formData.get('bloodGroup'),
          anyAllergy: formData.get('anyAllergy'),
          anyDisease: formData.get('anyDisease'),
          pastOperation: formData.get('pastOperation')
        }
        handleAddPatient(patientData)
      }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Aadhaar Number"
            name="aadharNumber"
            placeholder="Enter 12-digit Aadhaar number"
            required
          />
          <FormInput
            label="Email"
            type="email"
            name="email"
            placeholder="patient@example.com"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Mobile Number"
            name="mobileNumber"
            placeholder="Enter 10-digit mobile number"
            required
          />
          <FormInput
            label="Blood Group"
            name="bloodGroup"
            placeholder="e.g., A+, B-, O+, AB-"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="Any Allergy"
            name="anyAllergy"
            placeholder="List any allergies"
          />
          <FormInput
            label="Any Disease"
            name="anyDisease"
            placeholder="List any diseases"
          />
          <FormInput
            label="Past Operation"
            name="pastOperation"
            placeholder="List past operations"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Add Patient
        </button>
      </form>
    </div>
  )

  const renderAccessPatient = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Access Patient Data</h3>
      <form onSubmit={(e) => {
        e.preventDefault()
        handleAccessPatient(accessForm)
      }} className="space-y-4">
        <FormInput
          label="Aadhaar Number"
          value={accessForm.aadharNumber}
          onChange={(e) => setAccessForm({...accessForm, aadharNumber: e.target.value})}
          placeholder="Enter 12-digit Aadhaar number"
          required
        />
        <FormInput
          label="Email"
          type="email"
          value={accessForm.email}
          onChange={(e) => setAccessForm({...accessForm, email: e.target.value})}
          placeholder="patient@example.com"
          required
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Send OTP to Patient
        </button>
      </form>
    </div>
  )

  const renderEmergencyOverride = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center space-x-2 mb-6">
        <AlertTriangle className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-800">Emergency Override</h3>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-800">
          <strong>Warning:</strong> This action will be logged and monitored. Use only in genuine emergency situations.
        </p>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault()
        handleEmergencyOverride(emergencyForm)
      }} className="space-y-4">
        <FormInput
          label="Aadhaar Number"
          value={emergencyForm.aadharNumber}
          onChange={(e) => setEmergencyForm({...emergencyForm, aadharNumber: e.target.value})}
          placeholder="Enter 12-digit Aadhaar number"
          required
        />
        <FormInput
          label="Email"
          type="email"
          value={emergencyForm.email}
          onChange={(e) => setEmergencyForm({...emergencyForm, email: e.target.value})}
          placeholder="patient@example.com"
          required
        />
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Emergency Access
        </button>
      </form>
    </div>
  )

  const renderManagePatients = () => (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by Aadhaar, email, or blood group..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <Table
        data={filteredPatients}
        columns={patientColumns}
        loading={loading}
        emptyMessage="No patients found"
      />
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'add-patient':
        return renderAddPatient()
      case 'manage-patients':
        return renderManagePatients()
      case 'access-patient':
        return renderAccessPatient()
      case 'emergency':
        return renderEmergencyOverride()
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Hospital Information */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Hospital Profile</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hospital Name</label>
                    <p className="mt-1 text-gray-900">{userData?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-gray-900">{userData?.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900">{userData?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-gray-900">{userData?.phoneNumber}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-gray-900">{userData?.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Security Settings</h3>
              
              {/* Password Status Alert */}
              {isUsingGeneratedPassword(userData) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="text-yellow-800 font-medium">Password Change Required</h4>
                  </div>
                  <p className="text-yellow-700 text-sm mt-2">
                    You are currently using a system-generated password. For security reasons, 
                    please change your password immediately.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {isUsingGeneratedPassword(userData) ? 'Using generated password' : 'Password set'}
                    </span>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Change Password
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Status</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userData?.isDisabled 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {userData?.isDisabled ? 'Disabled' : 'Active'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userData?.verification_status === 'Verified'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {userData?.verification_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userType="hospital" />
      
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Hospital Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage patients and access medical records</p>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        }}
        title="Change Password"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">Change Your Password</h3>
            </div>
            <p className="text-blue-700 text-sm">
              For security reasons, please choose a strong password with at least 8 characters 
              including uppercase, lowercase, numbers, and special characters.
            </p>
          </div>

          <FormInput
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
            placeholder="Enter new password"
            required
          />

          <FormInput
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
            placeholder="Confirm new password"
            required
          />

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowPasswordModal(false)
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Change Password
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default HospitalDashboard
