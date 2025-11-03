import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings,
  Eye,
  Edit,
  Trash2,
  Search,
  Phone,
  Mail,
  Fingerprint,
  Activity
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
import { enrollFingerprint, searchFingerprint } from '../../utils/api'

const HospitalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [accessForm, setAccessForm] = useState({ aadharNumber: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isAddingPatient, setIsAddingPatient] = useState(false)
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false)
  const [isEnrollingFingerprint, setIsEnrollingFingerprint] = useState(false)
  const [isSearchingFingerprint, setIsSearchingFingerprint] = useState(false)
  const [fingerprintSlotNumber, setFingerprintSlotNumber] = useState(null)
  const addPatientFormRef = useRef(null)
  const [editForm, setEditForm] = useState({
    patientName: '',
    aadharNumber: '',
    email: '',
    mobileNumber: '',
    bloodGroup: '',
    anyAllergy: '',
    anyDisease: '',
    pastOperation: '',
    patientPrivacyPermission: ''
  })
  
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

  const handleAddPatient = async (patientData, formElement) => {
    setIsAddingPatient(true)
    try {
      const patientId = Date.now().toString()
      const newPatient = {
        patientId,
        addedBy: userData.hospitalId,
        ...patientData,
        fingerprintSlotNumber: fingerprintSlotNumber,
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
      
      // Reset form and fingerprint slot
      if (formElement) {
        formElement.reset()
      }
      setFingerprintSlotNumber(null)
      
      // Refresh patient list
      await fetchPatients()
    } catch (error) {
      console.error('Error adding patient:', error)
      toast.error('Failed to add patient')
    } finally {
      setIsAddingPatient(false)
    }
  }

  const handleUpdatePatient = async () => {
    if (!selectedPatient) return
    
    setIsUpdatingPatient(true)
    try {
      const patientId = selectedPatient.patientId || selectedPatient.id
      const updateData = {
        patientName: editForm.patientName,
        aadharNumber: editForm.aadharNumber,
        email: editForm.email,
        mobileNumber: editForm.mobileNumber,
        bloodGroup: editForm.bloodGroup,
        anyAllergy: editForm.anyAllergy,
        anyDisease: editForm.anyDisease,
        pastOperation: editForm.pastOperation,
        patientPrivacyPermission: editForm.patientPrivacyPermission,
        updatedAt: new Date().toISOString()
      }

      await updateDoc(doc(db, 'patient', patientId), updateData)
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId,
        action: 'UPDATE_PATIENT',
        remarks: `Updated patient: ${editForm.aadharNumber}`
      })

      toast.success('Patient updated successfully!')
      setShowModal(false)
      setSelectedPatient(null)
      await fetchPatients()
    } catch (error) {
      console.error('Error updating patient:', error)
      toast.error('Failed to update patient')
    } finally {
      setIsUpdatingPatient(false)
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

  const handleEnrollFingerprint = async () => {
    setIsEnrollingFingerprint(true)
    try {
      toast.loading('Please place your finger on the scanner...', { id: 'enroll' })
      const response = await enrollFingerprint()

      if (response.success) {
        setFingerprintSlotNumber(response.slot_number)
        toast.success(`Fingerprint enrolled successfully in slot ${response.slot_number}!`, { id: 'enroll' })
      } else {
        toast.error('Failed to enroll fingerprint', { id: 'enroll' })
      }
    } catch (error) {
      console.error('Enroll error:', error)
      toast.error(error.message || 'Failed to enroll fingerprint. Please try again.', { id: 'enroll' })
    } finally {
      setIsEnrollingFingerprint(false)
    }
  }

  const handleSearchFingerprint = async () => {
    setIsSearchingFingerprint(true)
    try {
      toast.loading('Please place your finger on the scanner...', { id: 'search' })
      const response = await searchFingerprint()

      if (response.success && response.slot_number !== null) {
        // Search for patient with this slot number
        const patientsQuery = query(
          collection(db, 'patient'),
          where('fingerprintSlotNumber', '==', response.slot_number),
          where('addedBy', '==', userData?.hospitalId || '')
        )
        const patientsSnapshot = await getDocs(patientsQuery)
        
        if (patientsSnapshot.empty) {
          toast.error('Patient not found with this fingerprint', { id: 'search' })
          return
        }

        const patientData = {
          id: patientsSnapshot.docs[0].id,
          ...patientsSnapshot.docs[0].data()
        }

        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          patientId: patientData.patientId,
          action: 'SEARCH_BY_FINGERPRINT',
          remarks: `Searched patient by fingerprint (slot ${response.slot_number})`
        })

        // Show patient details
        setSelectedPatient(patientData)
        setModalType('view')
        setShowModal(true)
        toast.success('Patient found!', { id: 'search' })
      } else {
        toast.error('Fingerprint not found in database', { id: 'search' })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error(error.message || 'Failed to search fingerprint. Please try again.', { id: 'search' })
    } finally {
      setIsSearchingFingerprint(false)
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
    patient.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.aadharNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.bloodGroup?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const patientColumns = [
    {
      header: 'Patient Name',
      key: 'patientName'
    },
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
            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPatient(row)
              setModalType('edit')
              // Initialize edit form with current patient data
              setEditForm({
                patientName: row.patientName || '',
                aadharNumber: row.aadharNumber || '',
                email: row.email || '',
                mobileNumber: row.mobileNumber || '',
                bloodGroup: row.bloodGroup || '',
                anyAllergy: row.anyAllergy || '',
                anyDisease: row.anyDisease || '',
                pastOperation: row.pastOperation || '',
                patientPrivacyPermission: row.patientPrivacyPermission || 'no'
              })
              setShowModal(true)
            }}
            className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
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
      title: 'Fingerprint Enrolled',
      value: patients.filter(p => p.fingerprintSlotNumber !== null && p.fingerprintSlotNumber !== undefined).length,
      icon: Fingerprint,
      color: 'from-purple-500 to-purple-600'
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
                <p className="font-medium text-gray-800">{patient.patientName || 'N/A'}</p>
                <p className="text-sm text-gray-500">{patient.aadharNumber} • {patient.email}</p>
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
      <form 
        ref={addPatientFormRef}
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target)
          const patientData = {
            patientName: formData.get('patientName'),
            aadharNumber: formData.get('aadharNumber'),
            email: formData.get('email'),
            mobileNumber: formData.get('mobileNumber'),
            bloodGroup: formData.get('bloodGroup'),
            anyAllergy: formData.get('anyAllergy'),
            anyDisease: formData.get('anyDisease'),
            pastOperation: formData.get('pastOperation'),
            patientPrivacyPermission: formData.get('patientPrivacyPermission')
          }
          handleAddPatient(patientData, e.target)
        }} 
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Patient Name"
            name="patientName"
            placeholder="Enter patient full name"
            required
          />
          <FormInput
            label="Aadhaar Number"
            name="aadharNumber"
            placeholder="Enter 12-digit Aadhaar number"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Email"
            type="email"
            name="email"
            placeholder="patient@example.com"
            required
          />
          <FormInput
            label="Mobile Number"
            name="mobileNumber"
            placeholder="Enter 10-digit mobile number"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        
        {/* Privacy Permission Radio Buttons */}
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Patient is willing to share this data to other hospitals in emergency
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="patientPrivacyPermission"
                value="yes"
                required
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-gray-700 font-medium">Yes</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="patientPrivacyPermission"
                value="no"
                required
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-gray-700 font-medium">No</span>
            </label>
          </div>
        </div>
        
        {/* Fingerprint Enrollment */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Fingerprint Enrollment (Optional)
          </label>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {fingerprintSlotNumber !== null ? (
                <p className="text-sm text-gray-700">
                  ✅ Fingerprint enrolled in slot <span className="font-semibold text-purple-600">{fingerprintSlotNumber}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Register patient's fingerprint to enable quick search later
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleEnrollFingerprint}
              disabled={isEnrollingFingerprint || isAddingPatient}
              className="ml-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isEnrollingFingerprint ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>{fingerprintSlotNumber !== null ? 'Re-enroll' : 'Enroll Fingerprint'}</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isAddingPatient}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isAddingPatient ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Adding Patient...</span>
            </>
          ) : (
            <span>Add Patient</span>
          )}
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

  const renderSearchFingerprint = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center space-x-2 mb-6">
        <Fingerprint className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">Search Patient by Fingerprint</h3>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Place the patient's finger on the scanner to search for their records in the database.
        </p>
      </div>
      <div className="space-y-4">
        <button
          onClick={handleSearchFingerprint}
          disabled={isSearchingFingerprint}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSearchingFingerprint ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-5 h-5" />
              <span>Scan Fingerprint</span>
            </>
          )}
        </button>
      </div>
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
              placeholder="Search patients by name, Aadhaar, email, or blood group..."
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
      case 'search-fingerprint':
        return renderSearchFingerprint()
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

      {/* Patient View/Edit Modal */}
      <Modal
        isOpen={showModal && selectedPatient !== null}
        onClose={() => {
          setShowModal(false)
          setSelectedPatient(null)
          setModalType('')
        }}
        title={modalType === 'view' ? 'Patient Details' : 'Edit Patient'}
        size="lg"
      >
        {modalType === 'view' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <p className="text-gray-900 font-medium text-lg">{selectedPatient?.patientName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <p className="text-gray-900 font-medium">{selectedPatient?.aadharNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 font-medium">{selectedPatient?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <p className="text-gray-900 font-medium">{selectedPatient?.mobileNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {selectedPatient?.bloodGroup || 'N/A'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any Allergy</label>
                <p className="text-gray-900">{selectedPatient?.anyAllergy || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any Disease</label>
                <p className="text-gray-900">{selectedPatient?.anyDisease || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Past Operation</label>
                <p className="text-gray-900">{selectedPatient?.pastOperation || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Permission</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedPatient?.patientPrivacyPermission === 'yes' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedPatient?.patientPrivacyPermission === 'yes' ? 'Yes - Share in Emergency' : 'No - Private'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fingerprint Slot</label>
                {selectedPatient?.fingerprintSlotNumber !== null && selectedPatient?.fingerprintSlotNumber !== undefined ? (
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                    Slot {selectedPatient.fingerprintSlotNumber}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">Not enrolled</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Added Date</label>
                <p className="text-gray-900">
                  {selectedPatient?.createdAt 
                    ? new Date(selectedPatient.createdAt).toLocaleString() 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <p className="text-gray-900">
                  {selectedPatient?.updatedAt 
                    ? new Date(selectedPatient.updatedAt).toLocaleString() 
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={(e) => {
              e.preventDefault()
              handleUpdatePatient()
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Patient Name"
                  value={editForm.patientName}
                  onChange={(e) => setEditForm({...editForm, patientName: e.target.value})}
                  placeholder="Enter patient full name"
                  required
                />
                <FormInput
                  label="Aadhaar Number"
                  value={editForm.aadharNumber}
                  onChange={(e) => setEditForm({...editForm, aadharNumber: e.target.value})}
                  placeholder="Enter 12-digit Aadhaar number"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  placeholder="patient@example.com"
                  required
                />
                <FormInput
                  label="Mobile Number"
                  value={editForm.mobileNumber}
                  onChange={(e) => setEditForm({...editForm, mobileNumber: e.target.value})}
                  placeholder="Enter 10-digit mobile number"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Blood Group"
                  value={editForm.bloodGroup}
                  onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})}
                  placeholder="e.g., A+, B-, O+, AB-"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="Any Allergy"
                  value={editForm.anyAllergy}
                  onChange={(e) => setEditForm({...editForm, anyAllergy: e.target.value})}
                  placeholder="List any allergies"
                />
                <FormInput
                  label="Any Disease"
                  value={editForm.anyDisease}
                  onChange={(e) => setEditForm({...editForm, anyDisease: e.target.value})}
                  placeholder="List any diseases"
                />
                <FormInput
                  label="Past Operation"
                  value={editForm.pastOperation}
                  onChange={(e) => setEditForm({...editForm, pastOperation: e.target.value})}
                  placeholder="List past operations"
                />
              </div>
              
              {/* Privacy Permission Radio Buttons */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Patient is willing to share this data to other hospitals in emergency
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="patientPrivacyPermission"
                      value="yes"
                      checked={editForm.patientPrivacyPermission === 'yes'}
                      onChange={(e) => setEditForm({...editForm, patientPrivacyPermission: e.target.value})}
                      required
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-700 font-medium">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="patientPrivacyPermission"
                      value="no"
                      checked={editForm.patientPrivacyPermission === 'no'}
                      onChange={(e) => setEditForm({...editForm, patientPrivacyPermission: e.target.value})}
                      required
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-700 font-medium">No</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedPatient(null)
                    setModalType('')
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPatient}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUpdatingPatient ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

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
