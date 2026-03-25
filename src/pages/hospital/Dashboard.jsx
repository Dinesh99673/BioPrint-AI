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
  Activity,
  Upload,
  Image as ImageIcon,
  X,
  User,
  AlertTriangle,
  Stethoscope
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from '../../components/Sidebar'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import FormInput from '../../components/FormInput'
import toast from 'react-hot-toast'
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, arrayUnion } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { updatePassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { cleanupGeneratedPassword, isUsingGeneratedPassword, validatePassword } from '../../utils/hospitalAuth'
import { enrollFingerprint, searchFingerprint, sendOtp, verifyOtp, sendEmail, predictBloodGroup, captureAndPredict } from '../../utils/api'

const HospitalDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [accessForm, setAccessForm] = useState({ aadharNumber: '', email: '' })
  const [accessPatientOtp, setAccessPatientOtp] = useState('')
  const [isSendingAccessOtp, setIsSendingAccessOtp] = useState(false)
  const [isVerifyingAccessOtp, setIsVerifyingAccessOtp] = useState(false)
  const [accessPatientData, setAccessPatientData] = useState(null)
  const [accessPatientNote, setAccessPatientNote] = useState('')
  const [isAddingAccessNote, setIsAddingAccessNote] = useState(false)
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
  const [patientImage, setPatientImage] = useState(null)
  const [patientImagePreview, setPatientImagePreview] = useState(null)
  const [addPatientAadhar, setAddPatientAadhar] = useState('')
  const [isSearchingAadhar, setIsSearchingAadhar] = useState(false)
  const [foundPatientForAdd, setFoundPatientForAdd] = useState(null)
  const [showRegistrationForm, setShowRegistrationForm] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [otpData, setOtpData] = useState({ email: '', otp: '', patientId: null, patientData: null })
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [patientNote, setPatientNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [editPatientNote, setEditPatientNote] = useState('')
  const [isAddingEditNote, setIsAddingEditNote] = useState(false)
  const [foundPatientByFingerprint, setFoundPatientByFingerprint] = useState(null)
  const [fingerprintOtpData, setFingerprintOtpData] = useState({ email: '', otp: '', patientId: null, patientData: null })
  const [isSendingFingerprintOtp, setIsSendingFingerprintOtp] = useState(false)
  const [isVerifyingFingerprintOtp, setIsVerifyingFingerprintOtp] = useState(false)
  const [fingerprintNote, setFingerprintNote] = useState('')
  const [isAddingFingerprintNote, setIsAddingFingerprintNote] = useState(false)
  const addPatientFormRef = useRef(null)
  const imageInputRef = useRef(null)
  // Blood group detection states
  const [bloodGroupFile, setBloodGroupFile] = useState(null)
  const [bloodGroupPreview, setBloodGroupPreview] = useState(null)
  const [isDetectingBloodGroup, setIsDetectingBloodGroup] = useState(false)
  const [isCapturingFingerprint, setIsCapturingFingerprint] = useState(false)
  const [bloodGroupResult, setBloodGroupResult] = useState(null)
  const bloodGroupFileInputRef = useRef(null)
  // Blood group search states
  const [bloodGroupSearch, setBloodGroupSearch] = useState({ bloodGroup: '', area: '' })
  const [bloodGroupSearchResults, setBloodGroupSearchResults] = useState([])
  const [isSearchingByBloodGroup, setIsSearchingByBloodGroup] = useState(false)
  const [editForm, setEditForm] = useState({
    patientName: '',
    aadharNumber: '',
    email: '',
    mobileNumber: '',
    relativesNumber: '',
    address: '',
    bloodGroup: '',
    anyAllergy: '',
    anyDisease: '',
    pastOperation: '',
    patientPrivacyPermission: '',
    patientImage: null
  })
  // Hospital staff (doctors) state
  const [doctors, setDoctors] = useState([])
  const [doctorsLoading, setDoctorsLoading] = useState(true)
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    profilePhoto: null,
    yearsOfExperience: '',
    post: '',
    qualifications: '',
    email: '',
    phone: ''
  })
  const [doctorPhotoPreview, setDoctorPhotoPreview] = useState(null)
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false)
  const [isUpdatingDoctor, setIsUpdatingDoctor] = useState(false)
  const doctorFormRef = useRef(null)
  const doctorImageInputRef = useRef(null)
  const editDoctorImageInputRef = useRef(null)
  
  const { userData, createLog } = useAuth()

  useEffect(() => {
    if (!userData?.hospitalId) {
      setLoading(false)
      setDoctorsLoading(false)
      return
    }
    fetchPatients()
    fetchDoctors()
  }, [userData?.hospitalId])

  const fetchPatients = async () => {
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. Please contact administrator.')
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const patientsQuery = query(
        collection(db, 'patient'),
        where('addedBy', '==', userData?.hospitalId || ''),
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

  const fetchDoctors = async () => {
    if (userData?.isDisabled) {
      setDoctorsLoading(false)
      return
    }
    setDoctorsLoading(true)
    try {
      const doctorsQuery = query(
        collection(db, 'doctor'),
        where('addedBy', '==', userData?.hospitalId || ''),
      )
      const doctorsSnapshot = await getDocs(doctorsQuery)
      const doctorsData = doctorsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
      setDoctors(doctorsData)
    } catch (error) {
      console.error('Error fetching doctors:', error)
      toast.error('Failed to fetch doctors')
    } finally {
      setDoctorsLoading(false)
    }
  }

  const getAllHospitalNotes = (patientData) => {
    if (!patientData?.hospitalRecords) return []

    const allNotes = []

    Object.entries(patientData.hospitalRecords).forEach(([hospitalId, record]) => {
      const notes = record?.notes || []
      if (!Array.isArray(notes)) return

      notes.forEach((note, index) => {
        allNotes.push({
          ...note,
          hospitalId,
          hospitalName: note?.hospitalName || hospitalId,
          uniqueKey: `${hospitalId}-${note?.addedAt || index}-${index}`
        })
      })
    })

    return allNotes.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
  }

  const handleAddDoctor = async (e) => {
    e.preventDefault()
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. Please contact administrator.')
      return
    }
    const name = doctorForm.name?.trim()
    const post = doctorForm.post?.trim()
    const yearsOfExperience = Number(doctorForm.yearsOfExperience)
    if (!name) {
      toast.error('Please enter doctor name')
      return
    }
    if (!post) {
      toast.error('Please enter post/designation')
      return
    }
    if (doctorForm.yearsOfExperience === '' || isNaN(yearsOfExperience) || yearsOfExperience < 0) {
      toast.error('Please enter a valid years of experience')
      return
    }
    setIsAddingDoctor(true)
    try {
      const doctorId = Date.now().toString()
      const currentTime = new Date().toISOString()
      const qualificationsArray = doctorForm.qualifications
        ? doctorForm.qualifications.split(',').map(q => q.trim()).filter(Boolean)
        : []
      const newDoctor = {
        doctorId,
        addedBy: userData.hospitalId,
        name,
        profilePhoto: doctorForm.profilePhoto || null,
        yearsOfExperience,
        post,
        qualifications: qualificationsArray,
        email: doctorForm.email?.trim() || '',
        phone: doctorForm.phone?.trim() || '',
        createdAt: currentTime,
        updatedAt: currentTime
      }
      await setDoc(doc(db, 'doctor', doctorId), newDoctor)
      await createLog({
        hospitalId: userData.hospitalId,
        action: 'ADD_DOCTOR',
        remarks: `Added doctor: ${name} (${post})`
      })
      toast.success('Doctor added successfully!')
      setShowAddDoctorModal(false)
      resetDoctorForm()
      fetchDoctors()
    } catch (error) {
      console.error('Error adding doctor:', error)
      toast.error('Failed to add doctor')
    } finally {
      setIsAddingDoctor(false)
    }
  }

  const resetDoctorForm = () => {
    setDoctorForm({
      name: '',
      profilePhoto: null,
      yearsOfExperience: '',
      post: '',
      qualifications: '',
      email: '',
      phone: ''
    })
    setDoctorPhotoPreview(null)
    if (doctorFormRef.current) doctorFormRef.current.reset()
    if (doctorImageInputRef.current) doctorImageInputRef.current.value = ''
    if (editDoctorImageInputRef.current) editDoctorImageInputRef.current.value = ''
  }

  const handleEditDoctorClick = (doctor) => {
    setSelectedDoctor(doctor)
    setDoctorForm({
      name: doctor.name || '',
      profilePhoto: doctor.profilePhoto || null,
      yearsOfExperience: doctor.yearsOfExperience !== undefined && doctor.yearsOfExperience !== null ? String(doctor.yearsOfExperience) : '',
      post: doctor.post || '',
      qualifications: Array.isArray(doctor.qualifications) ? doctor.qualifications.join(', ') : (doctor.qualifications || ''),
      email: doctor.email || '',
      phone: doctor.phone || ''
    })
    setDoctorPhotoPreview(doctor.profilePhoto || null)
    setShowEditDoctorModal(true)
  }

  const handleUpdateDoctor = async (e) => {
    e.preventDefault()
    if (!selectedDoctor) return
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. Please contact administrator.')
      return
    }
    const name = doctorForm.name?.trim()
    const post = doctorForm.post?.trim()
    const yearsOfExperience = Number(doctorForm.yearsOfExperience)
    if (!name) {
      toast.error('Please enter doctor name')
      return
    }
    if (!post) {
      toast.error('Please enter post/designation')
      return
    }
    if (doctorForm.yearsOfExperience === '' || isNaN(yearsOfExperience) || yearsOfExperience < 0) {
      toast.error('Please enter a valid years of experience')
      return
    }
    setIsUpdatingDoctor(true)
    try {
      const doctorId = selectedDoctor.doctorId || selectedDoctor.id
      const currentTime = new Date().toISOString()
      const qualificationsArray = doctorForm.qualifications
        ? doctorForm.qualifications.split(',').map(q => q.trim()).filter(Boolean)
        : []
      const updatedData = {
        name,
        profilePhoto: doctorForm.profilePhoto || null,
        yearsOfExperience,
        post,
        qualifications: qualificationsArray,
        email: doctorForm.email?.trim() || '',
        phone: doctorForm.phone?.trim() || '',
        updatedAt: currentTime
      }
      await updateDoc(doc(db, 'doctor', doctorId), updatedData)
      await createLog({
        hospitalId: userData.hospitalId,
        action: 'UPDATE_DOCTOR',
        remarks: `Updated doctor: ${name} (${post})`
      })
      toast.success('Doctor updated successfully!')
      setShowEditDoctorModal(false)
      setSelectedDoctor(null)
      resetDoctorForm()
      fetchDoctors()
    } catch (error) {
      console.error('Error updating doctor:', error)
      toast.error('Failed to update doctor')
    } finally {
      setIsUpdatingDoctor(false)
    }
  }

  const handleDeleteDoctor = async (doctor) => {
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. Please contact administrator.')
      return
    }
    if (!window.confirm(`Remove doctor "${doctor.name}" from staff list?`)) return
    try {
      const doctorId = doctor.doctorId || doctor.id
      await deleteDoc(doc(db, 'doctor', doctorId))
      await createLog({
        hospitalId: userData.hospitalId,
        action: 'DELETE_DOCTOR',
        remarks: `Removed doctor: ${doctor.name} (${doctor.post})`
      })
      toast.success('Doctor removed')
      fetchDoctors()
    } catch (error) {
      console.error('Error deleting doctor:', error)
      toast.error('Failed to remove doctor')
    }
  }

  const handleDoctorPhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setDoctorForm(prev => ({ ...prev, profilePhoto: reader.result }))
      setDoctorPhotoPreview(reader.result)
      toast.success('Photo selected')
    }
    reader.onerror = () => toast.error('Failed to read image')
    reader.readAsDataURL(file)
  }

  const handleAddPatient = async (patientData, formElement) => {
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. You cannot add new patients. Please contact administrator.')
      return
    }

    if (fingerprintSlotNumber === null || fingerprintSlotNumber === undefined) {
      toast.error('Fingerprint enrollment is required before adding patient')
      return
    }
    
    setIsAddingPatient(true)
    try {
      const patientId = Date.now().toString()
      const currentTime = new Date().toISOString()
      const hospitalId = userData.hospitalId
      
      const newPatient = {
        patientId,
        addedBy: hospitalId,
        primaryHospital: hospitalId,
        associatedHospitals: [hospitalId],
        hospitalRecords: {
          [hospitalId]: {
            linkedAt: currentTime,
            lastAccessed: currentTime,
            notes: []
          }
        },
        ...patientData,
        fingerprintSlotNumber: fingerprintSlotNumber || null,
        patientImage: patientImage || null,
        createdAt: currentTime,
        updatedAt: currentTime
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
      
      // Reset form, fingerprint slot, and image
      if (formElement) {
        formElement.reset()
      }
      setFingerprintSlotNumber(null)
      setPatientImage(null)
      setPatientImagePreview(null)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
      
      // Reset states
      setAddPatientAadhar('')
      setShowRegistrationForm(false)
      setFoundPatientForAdd(null)
      
      // Refresh patient list
      await fetchPatients()
    } catch (error) {
      console.error('Error adding patient:', error)
      toast.error('Failed to add patient')
    } finally {
      setIsAddingPatient(false)
    }
  }

  const handleSearchAadharForAdd = async () => {
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. You cannot add new patients. Please contact administrator.')
      return
    }

    setIsSearchingAadhar(true)
    try {
      toast.loading('Please place your finger on the scanner...', { id: 'add-patient-search' })

      const response = await searchFingerprint()
      if (!response.success || response.slot_number === null) {
        setShowRegistrationForm(true)
        setFoundPatientForAdd(null)
        setAddPatientAadhar('')
        toast.success('Fingerprint not found in records. Please register the patient as new.', { id: 'add-patient-search' })
        return
      }

      const patientsQuery = query(
        collection(db, 'patient'),
        where('fingerprintSlotNumber', '==', response.slot_number)
      )
      const patientsSnapshot = await getDocs(patientsQuery)
      
      if (patientsSnapshot.empty) {
        setShowRegistrationForm(true)
        setFoundPatientForAdd(null)
        setAddPatientAadhar('')
        toast.success('Fingerprint not found in records. Please register the patient as new.', { id: 'add-patient-search' })
        return
      }

      // Patient exists
      const existingPatientDoc = patientsSnapshot.docs[0]
      const existingPatient = {
        id: existingPatientDoc.id,
        ...existingPatientDoc.data()
      }
      setShowRegistrationForm(false)
      setAddPatientAadhar(existingPatient.aadharNumber || '')
      
      // Check if hospital already has access
      const hasAccess = existingPatient.associatedHospitals?.includes(userData.hospitalId) || 
                       existingPatient.addedBy === userData.hospitalId
      
      if (hasAccess) {
        setFoundPatientForAdd(existingPatient)
        toast.success('Patient found!', { id: 'add-patient-search' })
        return
      }
      
      // Check privacy permission
      if (existingPatient.patientPrivacyPermission === 'no') {
        // Privacy restricted - ask if they want to link
        const wantToLink = window.confirm('This patient has privacy restrictions. Do you want to request access? An OTP will be sent to the patient\'s email.')
        if (wantToLink) {
          setOtpData({
            email: existingPatient.email,
            otp: '',
            patientId: existingPatientDoc.id,
            patientData: existingPatient
          })
          setShowOtpModal(true)
          // Auto-send OTP
          handleSendOtp(existingPatient.email)
          toast.success('Patient found. OTP sent for access verification.', { id: 'add-patient-search' })
        }
        return
      }
      
      // Privacy permission is "yes" - automatically link hospital and show patient data
      await linkHospitalToPatient(existingPatientDoc.id, existingPatient)
      
      // Refresh patient data after linking
      const updatedPatientDoc = await getDocs(query(
        collection(db, 'patient'),
        where('aadharNumber', '==', existingPatient.aadharNumber)
      ))
      if (!updatedPatientDoc.empty) {
        const updatedPatient = {
          id: updatedPatientDoc.docs[0].id,
          ...updatedPatientDoc.docs[0].data()
        }
        setFoundPatientForAdd(updatedPatient)
      } else {
        setFoundPatientForAdd(existingPatient)
      }
      toast.success('Patient found!', { id: 'add-patient-search' })
    } catch (error) {
      console.error('Error searching fingerprint for add patient:', error)
      toast.error(error.message || 'Failed to search fingerprint. Please try again.', { id: 'add-patient-search' })
    } finally {
      setIsSearchingAadhar(false)
    }
  }

  const linkHospitalToPatient = async (patientId, patientData, initialNote = null) => {
    try {
      const hospitalId = userData.hospitalId
      const currentTime = new Date().toISOString()
      
      // Update hospitalRecords
      const hospitalRecord = {
        linkedAt: currentTime,
        lastAccessed: currentTime,
        notes: initialNote ? [{
          addedAt: currentTime,
          note: initialNote,
          addedBy: hospitalId,
          hospitalName: userData.name
        }] : []
      }
      
      // Update Firestore
      await updateDoc(doc(db, 'patient', patientId), {
        [`hospitalRecords.${hospitalId}`]: hospitalRecord,
        associatedHospitals: arrayUnion(hospitalId),
        updatedAt: currentTime
      })
      
      // Send email notification to patient
      try {
        await sendEmail({
          to: patientData.email,
          subject: 'New Hospital Linked to Your Medical Records',
          body: `A new hospital (${userData.name}) has been linked to your medical records. They now have access to your information.`
        })
      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // Don't fail the whole operation if email fails
      }
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId: patientData.patientId,
        action: 'LINK_PATIENT',
        remarks: `Linked to existing patient: ${patientData.aadharNumber}`
      })
      
      toast.success('Hospital linked to patient successfully!')
      
      // Refresh patient data
      const updatedPatientDoc = await getDocs(query(
        collection(db, 'patient'),
        where('aadharNumber', '==', patientData.aadharNumber)
      ))
      if (!updatedPatientDoc.empty) {
        const updatedPatient = {
          id: updatedPatientDoc.docs[0].id,
          ...updatedPatientDoc.docs[0].data()
        }
        setFoundPatientForAdd(updatedPatient)
      }
    } catch (error) {
      console.error('Error linking hospital to patient:', error)
      toast.error('Failed to link hospital to patient')
      throw error
    }
  }

  const handleSendOtp = async (email) => {
    setIsSendingOtp(true)
    try {
      await sendOtp(email)
      toast.success('OTP sent to patient email!')
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpData.otp || otpData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setIsVerifyingOtp(true)
    try {
      await verifyOtp(otpData.email, otpData.otp)
      
      // OTP verified - link hospital to patient
      if (otpData.patientId && otpData.patientData) {
        await linkHospitalToPatient(otpData.patientId, otpData.patientData)
        
        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          patientId: otpData.patientData.patientId,
          action: 'OTP_VERIFIED_ACCESS_GRANTED',
          remarks: `OTP verified and access granted for patient: ${otpData.patientData.aadharNumber}`
        })
        
        // Close OTP modal and show patient data
        setShowOtpModal(false)
        const patientDataCopy = otpData.patientData
        setOtpData({ email: '', otp: '', patientId: null, patientData: null })
        
        // Refresh and show patient
        const updatedPatientDoc = await getDocs(query(
          collection(db, 'patient'),
          where('aadharNumber', '==', patientDataCopy.aadharNumber)
        ))
        if (!updatedPatientDoc.empty) {
          const updatedPatient = {
            id: updatedPatientDoc.docs[0].id,
            ...updatedPatientDoc.docs[0].data()
          }
          setFoundPatientForAdd(updatedPatient)
        }
        
        toast.success('OTP verified! Access granted.')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to verify OTP')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleAddNote = async () => {
    if (!patientNote.trim() || !foundPatientForAdd) {
      toast.error('Please enter a note')
      return
    }

    setIsAddingNote(true)
    try {
      const hospitalId = userData.hospitalId
      const currentTime = new Date().toISOString()
      
      // Get current notes
      const currentNotes = foundPatientForAdd.hospitalRecords?.[hospitalId]?.notes || []
      
      // Add new note
      const newNote = {
        addedAt: currentTime,
        note: patientNote.trim(),
        addedBy: hospitalId,
        hospitalName: userData.name
      }
      
      const updatedNotes = [...currentNotes, newNote]
      
      // Update Firestore
      await updateDoc(doc(db, 'patient', foundPatientForAdd.id), {
        [`hospitalRecords.${hospitalId}.notes`]: updatedNotes,
        [`hospitalRecords.${hospitalId}.lastAccessed`]: currentTime,
        updatedAt: currentTime
      })
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId: foundPatientForAdd.patientId,
        action: 'ADD_NOTE',
        remarks: `Added note for patient: ${foundPatientForAdd.aadharNumber}`
      })
      
      // Refresh patient data
      const updatedPatientDoc = await getDocs(query(
        collection(db, 'patient'),
        where('aadharNumber', '==', foundPatientForAdd.aadharNumber)
      ))
      if (!updatedPatientDoc.empty) {
        const updatedPatient = {
          id: updatedPatientDoc.docs[0].id,
          ...updatedPatientDoc.docs[0].data()
        }
        setFoundPatientForAdd(updatedPatient)
      }
      
      setPatientNote('')
      toast.success('Note added successfully!')
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    } finally {
      setIsAddingNote(false)
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
        relativesNumber: editForm.relativesNumber,
        address: editForm.address,
        bloodGroup: editForm.bloodGroup,
        anyAllergy: editForm.anyAllergy,
        anyDisease: editForm.anyDisease,
        pastOperation: editForm.pastOperation,
        patientPrivacyPermission: editForm.patientPrivacyPermission,
        patientImage: editForm.patientImage || selectedPatient?.patientImage || null,
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
      setPatientImagePreview(null)
      await fetchPatients()
    } catch (error) {
      console.error('Error updating patient:', error)
      toast.error('Failed to update patient')
    } finally {
      setIsUpdatingPatient(false)
    }
  }

  const handleAccessPatient = async (formData) => {
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. You cannot access patient details. Please contact administrator.')
      return
    }
    
    setIsSendingAccessOtp(true)
    try {
      // First, search for patient by Aadhaar number
      const patientsQuery = query(
        collection(db, 'patient'),
        where('aadharNumber', '==', formData.aadharNumber.trim())
      )
      const patientsSnapshot = await getDocs(patientsQuery)
      
      if (patientsSnapshot.empty) {
        toast.error('Patient not found with this Aadhaar number')
        setIsSendingAccessOtp(false)
        return
      }

      const patientData = {
        id: patientsSnapshot.docs[0].id,
        ...patientsSnapshot.docs[0].data()
      }

      // Verify email matches
      if (patientData.email !== formData.email.trim()) {
        toast.error('Email does not match the patient record')
        setIsSendingAccessOtp(false)
        return
      }

      // Check if hospital already has access
      const hasAccess = patientData.associatedHospitals?.includes(userData.hospitalId) || 
                       patientData.addedBy === userData.hospitalId

      if (hasAccess) {
        // Hospital has access - show patient data directly
        // Update last accessed time
        if (patientData.hospitalRecords && patientData.hospitalRecords[userData.hospitalId]) {
          await updateDoc(doc(db, 'patient', patientData.id), {
            [`hospitalRecords.${userData.hospitalId}.lastAccessed`]: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          // Refresh patient data
          const updatedPatientDoc = await getDocs(query(
            collection(db, 'patient'),
            where('aadharNumber', '==', formData.aadharNumber.trim())
          ))
          if (!updatedPatientDoc.empty) {
            const updatedPatient = {
              id: updatedPatientDoc.docs[0].id,
              ...updatedPatientDoc.docs[0].data()
            }
            setAccessPatientData(updatedPatient)
          } else {
            setAccessPatientData(patientData)
          }
        } else {
          setAccessPatientData(patientData)
        }

        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          patientId: patientData.patientId,
          action: 'ACCESS_PATIENT',
          remarks: `Accessed patient data: ${formData.aadharNumber}`
        })

        toast.success('Patient data accessed!')
        setIsSendingAccessOtp(false)
        return
      }

      // Hospital doesn't have access - send OTP
      const response = await sendOtp(formData.email)

      if (response.success) {
        // Don't set accessPatientData yet - wait for OTP verification
        // Store patient data temporarily in a different way to show OTP input
        // We'll use accessForm to track that OTP was sent
        toast.success('OTP sent to patient email!')
        
        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          patientId: patientData.patientId,
          action: 'SEND_OTP_ACCESS',
          remarks: `Sent OTP to patient for access: ${formData.aadharNumber}`
        })
        
        // Store patient data in a temporary state for OTP verification
        // We'll use a ref or store it differently - for now, we'll store it in a way that doesn't trigger patient view
        // Actually, we need to store it somewhere accessible for handleVerifyAccessOtp
        // Let's use a separate state for pending patient data
        setAccessPatientData({ ...patientData, _pendingOtp: true })
      } else {
        throw new Error(response.message || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('Error accessing patient:', error)
      toast.error(error.message || 'Failed to access patient. Please try again.')
    } finally {
      setIsSendingAccessOtp(false)
    }
  }

  const handleVerifyAccessOtp = async () => {
    if (!accessPatientOtp || accessPatientOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    if (!accessPatientData) {
      toast.error('Patient data not found')
      return
    }

    setIsVerifyingAccessOtp(true)
    try {
      await verifyOtp(accessPatientData.email, accessPatientOtp)
      
      // OTP verified - link hospital to patient
      await linkHospitalToPatient(accessPatientData.id, accessPatientData)
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId: accessPatientData.patientId,
        action: 'OTP_VERIFIED_ACCESS_GRANTED',
        remarks: `OTP verified and access granted for patient: ${accessPatientData.aadharNumber}`
      })
      
      // Refresh patient data
      const updatedPatientDoc = await getDocs(query(
        collection(db, 'patient'),
        where('aadharNumber', '==', accessPatientData.aadharNumber)
      ))
      if (!updatedPatientDoc.empty) {
        const updatedPatient = {
          id: updatedPatientDoc.docs[0].id,
          ...updatedPatientDoc.docs[0].data()
        }
        // Remove _pendingOtp flag
        delete updatedPatient._pendingOtp
        setAccessPatientData(updatedPatient)
      }
      
      setAccessPatientOtp('')
      toast.success('OTP verified! Access granted.')
    } catch (error) {
      toast.error(error.message || 'Failed to verify OTP')
    } finally {
      setIsVerifyingAccessOtp(false)
    }
  }

  const handleSearchByBloodGroup = async () => {
    if (!bloodGroupSearch.bloodGroup.trim()) {
      toast.error('Please enter a blood group')
      return
    }

    setIsSearchingByBloodGroup(true)
    try {
      // Query patients with matching blood group and privacy permission = 'yes'
      const patientsQuery = query(
        collection(db, 'patient'),
        where('bloodGroup', '==', bloodGroupSearch.bloodGroup.trim()),
        where('patientPrivacyPermission', '==', 'yes')
      )
      const patientsSnapshot = await getDocs(patientsQuery)
      
      let results = patientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Filter by area substring if area is provided
      if (bloodGroupSearch.area.trim()) {
        const areaLower = bloodGroupSearch.area.trim().toLowerCase()
        results = results.filter(patient => {
          // Check multiple fields that might contain area information
          const location = (patient.location || '').toLowerCase()
          const address = (patient.address || '').toLowerCase()
          const area = (patient.area || '').toLowerCase()
          const city = (patient.city || '').toLowerCase()
          const state = (patient.state || '').toLowerCase()
          const pincode = (patient.pincode || '').toLowerCase()
          
          // Check if any of these fields contain the area substring
          return location.includes(areaLower) ||
                 address.includes(areaLower) ||
                 area.includes(areaLower) ||
                 city.includes(areaLower) ||
                 state.includes(areaLower) ||
                 pincode.includes(areaLower)
        })
      }

      setBloodGroupSearchResults(results)
      
      if (results.length === 0) {
        toast.success('No patients found matching the criteria')
      } else {
        toast.success(`Found ${results.length} patient(s)`)
        
        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          action: 'SEARCH_BY_BLOOD_GROUP',
          remarks: `Searched for blood group: ${bloodGroupSearch.bloodGroup}, area: ${bloodGroupSearch.area || 'all'}, found ${results.length} result(s)`
        })
      }
    } catch (error) {
      console.error('Error searching by blood group:', error)
      toast.error('Failed to search patients')
    } finally {
      setIsSearchingByBloodGroup(false)
    }
  }

  const handleAddAccessNote = async () => {
    if (!accessPatientNote.trim() || !accessPatientData) {
      toast.error('Please enter a note')
      return
    }

    setIsAddingAccessNote(true)
    try {
      const hospitalId = userData.hospitalId
      const currentTime = new Date().toISOString()
      
      // Get current notes
      const currentNotes = accessPatientData.hospitalRecords?.[hospitalId]?.notes || []
      
      // Add new note
      const newNote = {
        addedAt: currentTime,
        note: accessPatientNote.trim(),
        addedBy: hospitalId,
        hospitalName: userData.name
      }
      
      const updatedNotes = [...currentNotes, newNote]
      
      // Update Firestore
      await updateDoc(doc(db, 'patient', accessPatientData.id), {
        [`hospitalRecords.${hospitalId}.notes`]: updatedNotes,
        [`hospitalRecords.${hospitalId}.lastAccessed`]: currentTime,
        updatedAt: currentTime
      })
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId: accessPatientData.patientId,
        action: 'ADD_NOTE',
        remarks: `Added note for patient via access: ${accessPatientData.aadharNumber}`
      })
      
      // Refresh patient data
      const updatedPatientDoc = await getDocs(query(
        collection(db, 'patient'),
        where('aadharNumber', '==', accessPatientData.aadharNumber)
      ))
      if (!updatedPatientDoc.empty) {
        const updatedPatient = {
          id: updatedPatientDoc.docs[0].id,
          ...updatedPatientDoc.docs[0].data()
        }
        setAccessPatientData(updatedPatient)
      }
      
      setAccessPatientNote('')
      toast.success('Note added successfully!')
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    } finally {
      setIsAddingAccessNote(false)
    }
  }

  // Blood group detection handlers
  const handleBloodGroupFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setBloodGroupFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setBloodGroupPreview(e.target.result)
      reader.readAsDataURL(file)
      setBloodGroupResult(null)
      toast.success('Image selected successfully!')
    } else {
      toast.error('Please select a valid image file')
    }
  }

  const handleRemoveBloodGroupFile = () => {
    setBloodGroupFile(null)
    setBloodGroupPreview(null)
    setBloodGroupResult(null)
    if (bloodGroupFileInputRef.current) {
      bloodGroupFileInputRef.current.value = ''
    }
  }

  const handleDetectBloodGroupFromFile = async () => {
    if (!bloodGroupFile) {
      toast.error('Please select an image first')
      return
    }

    setIsDetectingBloodGroup(true)
    try {
      const response = await predictBloodGroup(bloodGroupFile)
      if (response.success) {
        setBloodGroupResult(response.predictions)
        toast.success('Blood group detected successfully!')
      } else {
        toast.error('Failed to detect blood group')
      }
    } catch (error) {
      console.error('Blood group detection error:', error)
      toast.error(error.message || 'Failed to detect blood group. Please try again.')
    } finally {
      setIsDetectingBloodGroup(false)
    }
  }

  const handleCaptureAndDetectBloodGroup = async () => {
    setIsCapturingFingerprint(true)
    try {
      toast.loading('Please place your finger on the scanner...', { id: 'capture-bg' })
      const response = await captureAndPredict()
      if (response.success) {
        setBloodGroupResult(response.predictions)
        toast.success('Fingerprint captured and blood group detected successfully!', { id: 'capture-bg' })
      } else {
        toast.error('Failed to detect blood group', { id: 'capture-bg' })
      }
    } catch (error) {
      console.error('Capture and detect error:', error)
      toast.error(error.message || 'Failed to capture fingerprint. Please try again.', { id: 'capture-bg' })
    } finally {
      setIsCapturingFingerprint(false)
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
    if (userData?.isDisabled) {
      toast.error('Your hospital account is disabled. You cannot search patients by fingerprint. Please contact administrator.')
      return
    }
    
    setIsSearchingFingerprint(true)
    try {
      toast.loading('Please place your finger on the scanner...', { id: 'search' })
      const response = await searchFingerprint()

      if (response.success && response.slot_number !== null) {
        // Search for patient with this slot number (across all hospitals)
        const patientsQuery = query(
          collection(db, 'patient'),
          where('fingerprintSlotNumber', '==', response.slot_number)
        )
        const patientsSnapshot = await getDocs(patientsQuery)
        
        if (patientsSnapshot.empty) {
          toast.error('Patient not found with this fingerprint. Please register the patient as new.', { id: 'search' })
          setIsSearchingFingerprint(false)
          return
        }

        const patientData = {
          id: patientsSnapshot.docs[0].id,
          ...patientsSnapshot.docs[0].data()
        }

        // Check if hospital already has access
        const hasAccess = patientData.associatedHospitals?.includes(userData.hospitalId) || 
                         patientData.addedBy === userData.hospitalId

        // If hospital already has access, show patient details regardless of privacy permission
        if (hasAccess) {
          // Update last accessed time
          if (patientData.hospitalRecords && patientData.hospitalRecords[userData.hospitalId]) {
            await updateDoc(doc(db, 'patient', patientData.id), {
              [`hospitalRecords.${userData.hospitalId}.lastAccessed`]: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            // Refresh patient data
            const updatedPatientDoc = await getDocs(query(
              collection(db, 'patient'),
              where('fingerprintSlotNumber', '==', response.slot_number)
            ))
            if (!updatedPatientDoc.empty) {
              const updatedPatient = {
                id: updatedPatientDoc.docs[0].id,
                ...updatedPatientDoc.docs[0].data()
              }
              setFoundPatientByFingerprint(updatedPatient)
            } else {
              setFoundPatientByFingerprint(patientData)
            }
          } else {
            setFoundPatientByFingerprint(patientData)
          }

          // Create log entry
          await createLog({
            hospitalId: userData.hospitalId,
            patientId: patientData.patientId,
            action: 'SEARCH_BY_FINGERPRINT',
            remarks: `Searched patient by fingerprint (slot ${response.slot_number})`
          })

          toast.success('Patient found!', { id: 'search' })
          setIsSearchingFingerprint(false)
          return
        }

        // Hospital doesn't have access - check privacy permission
        if (patientData.patientPrivacyPermission === 'no') {
          // Privacy restricted - ask if they want to send OTP
          const wantToSendOtp = window.confirm('This patient has privacy restrictions. Do you want to send OTP to the patient\'s registered email?')
          if (wantToSendOtp) {
            setFingerprintOtpData({
              email: patientData.email,
              otp: '',
              patientId: patientData.id,
              patientData: patientData
            })
            setIsSendingFingerprintOtp(true)
            try {
              await sendOtp(patientData.email)
              toast.success('OTP sent to patient email!', { id: 'search' })
            } catch (error) {
              toast.error(error.message || 'Failed to send OTP', { id: 'search' })
              setIsSendingFingerprintOtp(false)
              setIsSearchingFingerprint(false)
              return
            } finally {
              setIsSendingFingerprintOtp(false)
            }
          } else {
            setIsSearchingFingerprint(false)
            return
          }
        } else {
          // Privacy permission is "yes" - automatically link hospital and show patient details
          await linkHospitalToPatient(patientData.id, patientData)
          // Refresh patient data
          const updatedPatientDoc = await getDocs(query(
            collection(db, 'patient'),
            where('fingerprintSlotNumber', '==', response.slot_number)
          ))
          if (!updatedPatientDoc.empty) {
            const updatedPatient = {
              id: updatedPatientDoc.docs[0].id,
              ...updatedPatientDoc.docs[0].data()
            }
            setFoundPatientByFingerprint(updatedPatient)
          } else {
            setFoundPatientByFingerprint(patientData)
          }

          // Create log entry
          await createLog({
            hospitalId: userData.hospitalId,
            patientId: patientData.patientId,
            action: 'SEARCH_BY_FINGERPRINT',
            remarks: `Searched patient by fingerprint (slot ${response.slot_number})`
          })

          toast.success('Patient found!', { id: 'search' })
        }
      } else {
        toast.error('Fingerprint not found in database. Please register the patient as new.', { id: 'search' })
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error(error.message || 'Failed to search fingerprint. Please try again.', { id: 'search' })
    } finally {
      setIsSearchingFingerprint(false)
    }
  }

  const handleVerifyFingerprintOtp = async () => {
    if (!fingerprintOtpData.otp || fingerprintOtpData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setIsVerifyingFingerprintOtp(true)
    try {
      await verifyOtp(fingerprintOtpData.email, fingerprintOtpData.otp)
      
      // OTP verified - link hospital to patient
      if (fingerprintOtpData.patientId && fingerprintOtpData.patientData) {
        await linkHospitalToPatient(fingerprintOtpData.patientId, fingerprintOtpData.patientData)
        
        // Create log entry
        await createLog({
          hospitalId: userData.hospitalId,
          patientId: fingerprintOtpData.patientData.patientId,
          action: 'OTP_VERIFIED_FINGERPRINT_ACCESS',
          remarks: `OTP verified and access granted for patient via fingerprint: ${fingerprintOtpData.patientData.aadharNumber}`
        })
        
        // Refresh and show patient
        const updatedPatientDoc = await getDocs(query(
          collection(db, 'patient'),
          where('aadharNumber', '==', fingerprintOtpData.patientData.aadharNumber)
        ))
        if (!updatedPatientDoc.empty) {
          const updatedPatient = {
            id: updatedPatientDoc.docs[0].id,
            ...updatedPatientDoc.docs[0].data()
          }
          setFoundPatientByFingerprint(updatedPatient)
          setFingerprintOtpData({ email: '', otp: '', patientId: null, patientData: null })
        }
        
        toast.success('OTP verified! Access granted.', { id: 'fingerprint-otp' })
      }
    } catch (error) {
      toast.error(error.message || 'Failed to verify OTP', { id: 'fingerprint-otp' })
    } finally {
      setIsVerifyingFingerprintOtp(false)
    }
  }

  const handleAddFingerprintNote = async () => {
    if (!fingerprintNote.trim() || !foundPatientByFingerprint) {
      toast.error('Please enter a note')
      return
    }

    setIsAddingFingerprintNote(true)
    try {
      const hospitalId = userData.hospitalId
      const currentTime = new Date().toISOString()
      
      // Get current notes
      const currentNotes = foundPatientByFingerprint.hospitalRecords?.[hospitalId]?.notes || []
      
      // Add new note
      const newNote = {
        addedAt: currentTime,
        note: fingerprintNote.trim(),
        addedBy: hospitalId,
        hospitalName: userData.name
      }
      
      const updatedNotes = [...currentNotes, newNote]
      
      // Update Firestore
      await updateDoc(doc(db, 'patient', foundPatientByFingerprint.id), {
        [`hospitalRecords.${hospitalId}.notes`]: updatedNotes,
        [`hospitalRecords.${hospitalId}.lastAccessed`]: currentTime,
        updatedAt: currentTime
      })
      
      // Create log entry
      await createLog({
        hospitalId: userData.hospitalId,
        patientId: foundPatientByFingerprint.patientId,
        action: 'ADD_NOTE',
        remarks: `Added note for patient via fingerprint: ${foundPatientByFingerprint.aadharNumber}`
      })
      
      // Refresh patient data
      const updatedPatientDoc = await getDocs(query(
        collection(db, 'patient'),
        where('fingerprintSlotNumber', '==', foundPatientByFingerprint.fingerprintSlotNumber)
      ))
      if (!updatedPatientDoc.empty) {
        const updatedPatient = {
          id: updatedPatientDoc.docs[0].id,
          ...updatedPatientDoc.docs[0].data()
        }
        setFoundPatientByFingerprint(updatedPatient)
      }
      
      setFingerprintNote('')
      toast.success('Note added successfully!')
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    } finally {
      setIsAddingFingerprintNote(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result
      setPatientImage(base64String)
      setPatientImagePreview(base64String)
      toast.success('Image uploaded successfully!')
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  const handleEditImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result
      setEditForm({...editForm, patientImage: base64String})
      setPatientImagePreview(base64String)
      toast.success('Image updated successfully!')
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setPatientImage(null)
    setPatientImagePreview(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
    toast.success('Image removed')
  }

  const removeEditImage = () => {
    setEditForm({...editForm, patientImage: null})
    setPatientImagePreview(null)
    toast.success('Image removed')
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
      header: 'Photo',
      key: 'patientImage',
      render: (value) => (
        <div className="flex items-center justify-center">
          {value ? (
            <img 
              src={value} 
              alt="Patient" 
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      )
    },
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
                relativesNumber: row.relativesNumber || '',
                address: row.address || '',
                bloodGroup: row.bloodGroup || '',
                anyAllergy: row.anyAllergy || '',
                anyDisease: row.anyDisease || '',
                pastOperation: row.pastOperation || '',
                patientPrivacyPermission: row.patientPrivacyPermission || 'no',
                patientImage: row.patientImage || null
              })
              setPatientImagePreview(row.patientImage || null)
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
    },
    {
      title: 'Total Doctors',
      value: doctors.length,
      icon: Stethoscope,
      color: 'from-teal-500 to-teal-600'
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

      {/* Recent Patients */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Patients</h3>
        <div className="space-y-3">
          {patients.slice(0, 5).map((patient, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {patient.patientImage ? (
                  <img 
                    src={patient.patientImage} 
                    alt={patient.patientName || 'Patient'} 
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-800">{patient.patientName || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{patient.aadharNumber} • {patient.email}</p>
                </div>
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

  const renderAddPatient = () => {
    // Show disabled message if hospital is disabled
    if (userData?.isDisabled) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Add New Patient</h3>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-lg font-semibold text-red-800 mb-2">Account Disabled</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Your hospital account has been disabled. You cannot add new patients at this time. 
                  Please contact the administrator to restore access to your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // Step 1: Fingerprint Search (if patient not found and registration form not shown)
    if (!showRegistrationForm && !foundPatientForAdd) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Add New Patient</h3>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Step 1:</strong> Scan the patient's fingerprint to check if they already exist in the system.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleSearchAadharForAdd}
              disabled={isSearchingAadhar || userData?.isDisabled}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSearchingAadhar ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Scanning...</span>
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
    }

    // Step 2: Patient Found - Show Patient Data and Notes
    if (foundPatientForAdd) {
      const hospitalId = userData.hospitalId
      const allHospitalNotes = getAllHospitalNotes(foundPatientForAdd)
      const hasAccess = foundPatientForAdd.associatedHospitals?.includes(hospitalId) || 
                       foundPatientForAdd.addedBy === hospitalId
      
      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Patient Found</h3>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              ✅ Patient matched by fingerprint. Aadhaar number <strong>{foundPatientForAdd.aadharNumber}</strong> exists in the system.
              {hasAccess ? ' You have access to this patient.' : ' Linking hospital...'}
            </p>
          </div>

          {/* Patient Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Patient Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <p className="text-gray-900 font-medium">{foundPatientForAdd.patientName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <p className="text-gray-900 font-medium">{foundPatientForAdd.aadharNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 font-medium">{foundPatientForAdd.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <p className="text-gray-900 font-medium">{foundPatientForAdd.mobileNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {foundPatientForAdd.bloodGroup || 'N/A'}
                </span>
              </div>
              {foundPatientForAdd.relativesNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relatives Number</label>
                  <p className="text-gray-900 font-medium">{foundPatientForAdd.relativesNumber}</p>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{foundPatientForAdd.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Add Note Section */}
          {hasAccess && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Treatment Note
              </label>
              <textarea
                value={patientNote}
                onChange={(e) => setPatientNote(e.target.value)}
                placeholder="Enter treatment note or summary..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={isAddingNote || !patientNote.trim()}
                className="mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isAddingNote ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Note</span>
                )}
              </button>
            </div>
          )}

          {/* Display Notes */}
          {hasAccess && allHospitalNotes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Treatment Notes</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allHospitalNotes.map((note) => (
                  <div key={note.uniqueKey} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700">
                        {note.hospitalName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.addedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setFoundPatientForAdd(null)
              setAddPatientAadhar('')
              setShowRegistrationForm(false)
              setPatientNote('')
            }}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
          >
            Search Another Patient
          </button>
        </div>
      )
    }

    // Step 3: Registration Form (if patient not found)
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Register New Patient</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            Fingerprint not found in records. Please fill in the details to register a new patient.
          </p>
        </div>
        
        <button
          type="button"
          onClick={() => {
            setShowRegistrationForm(false)
            setAddPatientAadhar('')
            setFoundPatientForAdd(null)
          }}
          className="mb-4 text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-2"
        >
          <Fingerprint className="w-4 h-4" />
          <span>Scan Again</span>
        </button>
        
        <form 
          ref={addPatientFormRef}
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target)
            const enteredAadhar = (formData.get('aadharNumber') || '').toString().replace(/\D/g, '').slice(0, 12)
            const patientData = {
              patientName: formData.get('patientName'),
              aadharNumber: enteredAadhar,
              email: formData.get('email'),
              mobileNumber: formData.get('mobileNumber'),
              relativesNumber: formData.get('relativesNumber'),
              address: formData.get('address'),
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
            defaultValue={addPatientAadhar}
            maxLength={12}
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
            label="Relatives Number"
            name="relativesNumber"
            placeholder="Enter relative's contact number"
          />
          <FormInput
            label="Blood Group"
            name="bloodGroup"
            placeholder="e.g., A+, B-, O+, AB-"
            required
          />
        </div>
        <div>
          <FormInput
            label="Patient Address"
            name="address"
            placeholder="Enter patient's full address"
            required
          />
        </div>
        
        {/* Patient Image Upload */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Patient Photo (Optional)
          </label>
          <div className="flex items-center space-x-4">
            {patientImagePreview ? (
              <div className="relative">
                <img 
                  src={patientImagePreview} 
                  alt="Patient preview" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-dashed border-gray-300">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="patient-image-upload"
              />
              <label
                htmlFor="patient-image-upload"
                className="cursor-pointer inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Upload className="w-4 h-4" />
                <span>{patientImagePreview ? 'Change Photo' : 'Upload Photo'}</span>
              </label>
              <p className="text-xs text-gray-500 mt-2">Max size: 5MB</p>
            </div>
          </div>
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
            Fingerprint Enrollment
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {fingerprintSlotNumber !== null ? (
                <p className="text-sm text-gray-700">
                  ✅ Fingerprint enrolled in slot <span className="font-semibold text-purple-600">{fingerprintSlotNumber}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Enroll patient's fingerprint to continue patient registration
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
          disabled={isAddingPatient || fingerprintSlotNumber === null || fingerprintSlotNumber === undefined}
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
  }
  const renderAccessPatient = () => {
    // Show disabled message if hospital is disabled
    if (userData?.isDisabled) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Access Patient Data</h3>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-lg font-semibold text-red-800 mb-2">Account Disabled</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Your hospital account has been disabled. You cannot access patient details at this time. 
                  Please contact the administrator to restore access to your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // Show patient data if accessed (and not pending OTP)
    if (accessPatientData && !accessPatientData._pendingOtp) {
      const hospitalId = userData.hospitalId
      const hasAccess = accessPatientData.associatedHospitals?.includes(hospitalId) || 
                       accessPatientData.addedBy === hospitalId
      const allHospitalNotes = getAllHospitalNotes(accessPatientData)

      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Patient Data</h3>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              ✅ Patient data accessed successfully
            </p>
          </div>

          {/* Patient Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Patient Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <p className="text-gray-900 font-medium">{accessPatientData.patientName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <p className="text-gray-900 font-medium">{accessPatientData.aadharNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 font-medium">{accessPatientData.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <p className="text-gray-900 font-medium">{accessPatientData.mobileNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relatives Number</label>
                <p className="text-gray-900 font-medium">{accessPatientData.relativesNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {accessPatientData.bloodGroup || 'N/A'}
                </span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{accessPatientData.address || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any Allergy</label>
                <p className="text-gray-900">{accessPatientData.anyAllergy || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any Disease</label>
                <p className="text-gray-900">{accessPatientData.anyDisease || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Past Operation</label>
                <p className="text-gray-900">{accessPatientData.pastOperation || 'None'}</p>
              </div>
            </div>
          </div>

          {/* Add Note Section - Show if hospital has access */}
          {hasAccess && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Treatment Note
              </label>
              <textarea
                value={accessPatientNote}
                onChange={(e) => setAccessPatientNote(e.target.value)}
                placeholder="Enter treatment note or summary..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <button
                type="button"
                onClick={handleAddAccessNote}
                disabled={isAddingAccessNote || !accessPatientNote.trim()}
                className="mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isAddingAccessNote ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Add Note</span>
                )}
              </button>
            </div>
          )}

          {/* Display Notes */}
          {hasAccess && allHospitalNotes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Treatment Notes</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allHospitalNotes.map((note) => (
                  <div key={note.uniqueKey} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700">
                        {note.hospitalName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.addedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setAccessPatientData(null)
              setAccessForm({ aadharNumber: '', email: '' })
              setAccessPatientOtp('')
              setAccessPatientNote('')
            }}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
          >
            Search Another Patient
          </button>
        </div>
      )
    }

    // Show OTP input if OTP was sent (patient data exists but is pending OTP)
    const showOtpInput = accessPatientData && accessPatientData._pendingOtp

    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Access Patient Data</h3>
        
        {!showOtpInput ? (
          <form onSubmit={(e) => {
            e.preventDefault()
            handleAccessPatient(accessForm)
          }} className="space-y-4">
            <FormInput
              label="Aadhaar Number"
              value={accessForm.aadharNumber}
              onChange={(e) => setAccessForm({...accessForm, aadharNumber: e.target.value.replace(/\D/g, '').slice(0, 12)})}
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
              disabled={isSendingAccessOtp || userData?.isDisabled}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSendingAccessOtp ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Send OTP to Patient</span>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                An OTP has been sent to <strong>{accessForm.email}</strong>. Please enter the OTP to verify and access patient details.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={accessPatientOtp}
                onChange={(e) => setAccessPatientOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setAccessForm({ aadharNumber: '', email: '' })
                  setAccessPatientOtp('')
                }}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSendingAccessOtp(true)
                  try {
                    await sendOtp(accessForm.email)
                    toast.success('OTP resent to patient email!')
                  } catch (error) {
                    toast.error(error.message || 'Failed to resend OTP')
                  } finally {
                    setIsSendingAccessOtp(false)
                  }
                }}
                disabled={isSendingAccessOtp}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg disabled:opacity-50"
              >
                {isSendingAccessOtp ? 'Sending...' : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={handleVerifyAccessOtp}
                disabled={isVerifyingAccessOtp || accessPatientOtp.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isVerifyingAccessOtp ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSearchFingerprint = () => {
    // Show disabled message if hospital is disabled
    if (userData?.isDisabled) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <Fingerprint className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Search Patient by Fingerprint</h3>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-lg font-semibold text-red-800 mb-2">Account Disabled</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  Your hospital account has been disabled. You cannot search patients by fingerprint at this time. 
                  Please contact the administrator to restore access to your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // Show OTP input if OTP was sent
    if (fingerprintOtpData.email && fingerprintOtpData.patientData) {
      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <Fingerprint className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">OTP Verification</h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              An OTP has been sent to <strong>{fingerprintOtpData.email}</strong>. Please enter the OTP to verify and access patient details.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={fingerprintOtpData.otp}
                onChange={(e) => setFingerprintOtpData({ ...fingerprintOtpData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setFingerprintOtpData({ email: '', otp: '', patientId: null, patientData: null })
                  setFoundPatientByFingerprint(null)
                }}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSendingFingerprintOtp(true)
                  try {
                    await sendOtp(fingerprintOtpData.email)
                    toast.success('OTP resent to patient email!')
                  } catch (error) {
                    toast.error(error.message || 'Failed to resend OTP')
                  } finally {
                    setIsSendingFingerprintOtp(false)
                  }
                }}
                disabled={isSendingFingerprintOtp}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg disabled:opacity-50"
              >
                {isSendingFingerprintOtp ? 'Sending...' : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={handleVerifyFingerprintOtp}
                disabled={isVerifyingFingerprintOtp || fingerprintOtpData.otp.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isVerifyingFingerprintOtp ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Show patient details if found
    if (foundPatientByFingerprint) {
      const hospitalId = userData.hospitalId
      const allHospitalNotes = getAllHospitalNotes(foundPatientByFingerprint)
      const hasAccess = foundPatientByFingerprint.associatedHospitals?.includes(hospitalId) || 
                       foundPatientByFingerprint.addedBy === hospitalId

      return (
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <Fingerprint className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Patient Found</h3>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              ✅ Patient found with fingerprint slot <strong>{foundPatientByFingerprint.fingerprintSlotNumber}</strong>
            </p>
          </div>

          {/* Patient Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h4 className="text-md font-semibold text-gray-800 mb-4">Patient Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <p className="text-gray-900 font-medium">{foundPatientByFingerprint.patientName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                <p className="text-gray-900 font-medium">{foundPatientByFingerprint.aadharNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 font-medium">{foundPatientByFingerprint.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <p className="text-gray-900 font-medium">{foundPatientByFingerprint.mobileNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relatives Number</label>
                <p className="text-gray-900 font-medium">{foundPatientByFingerprint.relativesNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {foundPatientByFingerprint.bloodGroup || 'N/A'}
                </span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{foundPatientByFingerprint.address || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any Allergy</label>
                <p className="text-gray-900">{foundPatientByFingerprint.anyAllergy || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any Disease</label>
                <p className="text-gray-900">{foundPatientByFingerprint.anyDisease || 'None'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Past Operation</label>
                <p className="text-gray-900">{foundPatientByFingerprint.pastOperation || 'None'}</p>
              </div>
            </div>
          </div>

          {/* Add Note Section - Always show when patient is found */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Treatment Note
            </label>
            <textarea
              value={fingerprintNote}
              onChange={(e) => setFingerprintNote(e.target.value)}
              placeholder="Enter treatment note or summary..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              type="button"
              onClick={handleAddFingerprintNote}
              disabled={isAddingFingerprintNote || !fingerprintNote.trim()}
              className="mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isAddingFingerprintNote ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Note</span>
              )}
            </button>
          </div>

          {/* Display Notes */}
          {hasAccess && allHospitalNotes.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4">Treatment Notes</h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {allHospitalNotes.map((note) => (
                  <div key={note.uniqueKey} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-blue-700">
                        {note.hospitalName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(note.addedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setFoundPatientByFingerprint(null)
              setFingerprintOtpData({ email: '', otp: '', patientId: null, patientData: null })
              setFingerprintNote('')
            }}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
          >
            Search Another Patient
          </button>
        </div>
      )
    }

    // Initial state - show scan button
    return (
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
            disabled={isSearchingFingerprint || userData?.isDisabled}
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

        {/* Blood Group Detection Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-800">Blood Group Detection</h3>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Instructions:</strong> Upload a fingerprint image or scan directly from the R307s sensor to detect blood group using AI.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">Important Medical Disclaimer</h4>
                <p className="text-sm text-red-700 leading-relaxed">
                  This AI system is currently in <strong>training and development phase</strong>. Blood group predictions are <strong>experimental and should not be used as the sole basis for medical decisions or patient care</strong>. Always verify results with standard laboratory testing methods before making any clinical decisions. The accuracy rates may vary in real-world scenarios. This system is intended for research and educational purposes only.
                </p>
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Fingerprint Image
            </label>
            <div className="relative">
              {!bloodGroupPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={bloodGroupFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBloodGroupFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (Max 10MB)</p>
                </div>
              ) : (
                <div className="relative border-2 border-green-300 rounded-lg p-4 bg-green-50">
                  <img
                    src={bloodGroupPreview}
                    alt="Fingerprint preview"
                    className="w-full h-48 object-contain rounded-lg mb-3"
                  />
                  <button
                    onClick={handleRemoveBloodGroupFile}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDetectBloodGroupFromFile}
                    disabled={isDetectingBloodGroup || isCapturingFingerprint}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isDetectingBloodGroup ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        <span>Detect Blood Group from Image</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Scanner Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Scan from R307s Sensor
            </label>
            <button
              onClick={handleCaptureAndDetectBloodGroup}
              disabled={isCapturingFingerprint || isDetectingBloodGroup}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isCapturingFingerprint ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Capture & Detect from Scanner</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display - VGG16 only */}
          {bloodGroupResult && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Detection Results</span>
              </h4>
              <div className="bg-white rounded-lg p-4 shadow-md mb-4">
                <p className="text-sm text-gray-600 mb-1">VGG16 Model</p>
                <p className="text-3xl font-bold text-blue-600">{bloodGroupResult.vgg16?.blood_group || 'N/A'}</p>
                {/* <p className="text-sm text-gray-600 mt-1">
                  Confidence: {bloodGroupResult.vgg16?.confidence ?? 0}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${bloodGroupResult.vgg16?.confidence ?? 0}%` }}
                  ></div>
                </div> */}
              </div>
              <button
                onClick={() => {
                  setBloodGroupResult(null)
                  setBloodGroupFile(null)
                  setBloodGroupPreview(null)
                  if (bloodGroupFileInputRef.current) {
                    bloodGroupFileInputRef.current.value = ''
                  }
                }}
                className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg bg-white"
              >
                Clear Results
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSearchByBloodGroup = () => (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-800">Search by Blood Group</h3>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong> Enter blood group and optionally an area to search for patients who have given privacy permission. Only patients with <strong>patientPrivacyPermission: "yes"</strong> will be shown in results.
        </p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blood Group
            <span className="text-red-500 ml-1">*</span>
          </label>
          <select
            value={bloodGroupSearch.bloodGroup}
            onChange={(e) => setBloodGroupSearch({ ...bloodGroupSearch, bloodGroup: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Area (Optional)
          </label>
          <input
            type="text"
            value={bloodGroupSearch.area}
            onChange={(e) => setBloodGroupSearch({ ...bloodGroupSearch, area: e.target.value })}
            placeholder="Enter area, city, location, or pincode..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to search all areas</p>
        </div>
        
        <button
          onClick={handleSearchByBloodGroup}
          disabled={isSearchingByBloodGroup || !bloodGroupSearch.bloodGroup.trim()}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSearchingByBloodGroup ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Search Patients</span>
            </>
          )}
        </button>
      </div>

      {/* Results Display */}
      {bloodGroupSearchResults.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Search Results ({bloodGroupSearchResults.length} patient(s) found)
          </h4>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {bloodGroupSearchResults.map((patient) => (
              <div key={patient.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Patient Name</label>
                    <p className="text-gray-900 font-medium">{patient.patientName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Aadhaar Number</label>
                    <p className="text-gray-900">{patient.aadharNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-gray-900">{patient.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Mobile Number</label>
                    <p className="text-gray-900">{patient.mobileNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Blood Group</label>
                    <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      {patient.bloodGroup || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                    <p className="text-gray-900">
                      {patient.address || patient.location || patient.area || patient.city || 'N/A'}
                    </p>
                  </div>
                </div>
                {patient.relativesNumber && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Relatives Number</label>
                    <p className="text-gray-900">{patient.relativesNumber}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              setBloodGroupSearchResults([])
              setBloodGroupSearch({ bloodGroup: '', area: '' })
            }}
            className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg bg-white"
          >
            Clear Results
          </button>
        </div>
      )}
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

  const doctorColumns = [
    {
      header: 'Photo',
      key: 'profilePhoto',
      render: (value) => (
        <div className="flex items-center justify-center">
          {value ? (
            <img
              src={value}
              alt="Doctor"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      )
    },
    { header: 'Name', key: 'name' },
    { header: 'Post', key: 'post' },
    {
      header: 'Years of Experience',
      key: 'yearsOfExperience',
      render: (value) => (value !== undefined && value !== null ? `${value} yrs` : '-')
    },
    {
      header: 'Qualifications',
      key: 'qualifications',
      render: (value) => (Array.isArray(value) ? value.join(', ') : value || '-')
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleEditDoctorClick(row)
            }}
            className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
            title="Edit doctor"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteDoctor(row)
            }}
            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
            title="Remove from staff"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const renderHospitalStaff = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Hospital Staff</h3>
            <p className="text-sm text-gray-500 mt-1">Add and manage doctors at your hospital</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDoctorModal(true)}
            disabled={userData?.isDisabled}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Doctor</span>
          </button>
        </div>

        <Table
          data={doctors}
          columns={doctorColumns}
          loading={doctorsLoading}
          emptyMessage="No doctors added yet. Click Add Doctor to get started."
        />
      </div>
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
      case 'hospital-staff':
        return renderHospitalStaff()
      case 'access-patient':
        return renderAccessPatient()
      case 'search-fingerprint':
        return renderSearchFingerprint()
      case 'search-blood-group':
        return renderSearchByBloodGroup()
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
          setPatientImagePreview(null)
        }}
        title={modalType === 'view' ? 'Patient Details' : 'Edit Patient'}
        size="lg"
      >
        {modalType === 'view' ? (
          <div className="space-y-4">
            {/* Patient Image */}
            <div className="flex justify-center mb-4">
              {selectedPatient?.patientImage ? (
                <img 
                  src={selectedPatient.patientImage} 
                  alt={selectedPatient?.patientName || 'Patient'} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <User className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Relatives Number</label>
                <p className="text-gray-900 font-medium">{selectedPatient?.relativesNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                  {selectedPatient?.bloodGroup || 'N/A'}
                </span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{selectedPatient?.address || 'N/A'}</p>
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

            {/* Treatment Notes Section */}
            {selectedPatient?.hospitalRecords && (
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Treatment Notes</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(() => {
                    // Collect all notes from all hospitals
                    const allNotes = []
                    Object.entries(selectedPatient.hospitalRecords).forEach(([hospitalId, record]) => {
                      const notes = record?.notes || []
                      if (Array.isArray(notes)) {
                        notes.forEach((note, index) => {
                          allNotes.push({
                            ...note,
                            hospitalId,
                            uniqueKey: `${hospitalId}-${index}`
                          })
                        })
                      }
                    })
                    
                    // Sort by date (newest first)
                    allNotes.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
                    
                    if (allNotes.length === 0) {
                      return (
                        <p className="text-gray-500 text-sm text-center py-4">No treatment notes available.</p>
                      )
                    }
                    
                    return allNotes.map((note) => (
                      <div key={note.uniqueKey} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {note.hospitalName || 'Hospital'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.addedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.note}</p>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={(e) => {
              e.preventDefault()
              handleUpdatePatient()
            }}>
              {/* Patient Image Upload in Edit */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Patient Photo
                </label>
                <div className="flex items-center space-x-4">
                  {patientImagePreview ? (
                    <div className="relative">
                      <img 
                        src={patientImagePreview} 
                        alt="Patient preview" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <button
                        type="button"
                        onClick={removeEditImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-dashed border-gray-300">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      className="hidden"
                      id="edit-patient-image-upload"
                    />
                    <label
                      htmlFor="edit-patient-image-upload"
                      className="cursor-pointer inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{patientImagePreview ? 'Change Photo' : 'Upload Photo'}</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Max size: 5MB</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.patientName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhaar Number
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.aadharNumber}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>
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
                  label="Relatives Number"
                  value={editForm.relativesNumber}
                  onChange={(e) => setEditForm({...editForm, relativesNumber: e.target.value})}
                  placeholder="Enter relative's contact number"
                />
                <FormInput
                  label="Blood Group"
                  value={editForm.bloodGroup}
                  onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})}
                  placeholder="e.g., A+, B-, O+, AB-"
                  required
                />
              </div>
              <div>
                <FormInput
                  label="Patient Address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                  placeholder="Enter patient's full address"
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

              {/* Add Note Section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Treatment Note
                </label>
                <textarea
                  value={editPatientNote}
                  onChange={(e) => setEditPatientNote(e.target.value)}
                  placeholder="Enter treatment note or summary..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!editPatientNote.trim() || !selectedPatient) {
                      toast.error('Please enter a note')
                      return
                    }

                    setIsAddingEditNote(true)
                    try {
                      const hospitalId = userData.hospitalId
                      const currentTime = new Date().toISOString()
                      
                      // Get current notes
                      const currentNotes = selectedPatient.hospitalRecords?.[hospitalId]?.notes || []
                      
                      // Add new note
                      const newNote = {
                        addedAt: currentTime,
                        note: editPatientNote.trim(),
                        addedBy: hospitalId,
                        hospitalName: userData.name
                      }
                      
                      const updatedNotes = [...currentNotes, newNote]
                      
                      // Update Firestore
                      await updateDoc(doc(db, 'patient', selectedPatient.id || selectedPatient.patientId), {
                        [`hospitalRecords.${hospitalId}.notes`]: updatedNotes,
                        [`hospitalRecords.${hospitalId}.lastAccessed`]: currentTime,
                        updatedAt: currentTime
                      })
                      
                      // Create log entry
                      await createLog({
                        hospitalId: userData.hospitalId,
                        patientId: selectedPatient.patientId || selectedPatient.id,
                        action: 'ADD_NOTE',
                        remarks: `Added note for patient: ${selectedPatient.aadharNumber}`
                      })
                      
                      // Refresh patient data
                      const updatedPatientDoc = await getDocs(query(
                        collection(db, 'patient'),
                        where('aadharNumber', '==', selectedPatient.aadharNumber)
                      ))
                      if (!updatedPatientDoc.empty) {
                        const updatedPatient = {
                          id: updatedPatientDoc.docs[0].id,
                          ...updatedPatientDoc.docs[0].data()
                        }
                        setSelectedPatient(updatedPatient)
                        // Update editForm with latest patient data
                        setEditForm({
                          patientName: updatedPatient.patientName || '',
                          aadharNumber: updatedPatient.aadharNumber || '',
                          email: updatedPatient.email || '',
                          mobileNumber: updatedPatient.mobileNumber || '',
                          relativesNumber: updatedPatient.relativesNumber || '',
                          bloodGroup: updatedPatient.bloodGroup || '',
                          anyAllergy: updatedPatient.anyAllergy || '',
                          anyDisease: updatedPatient.anyDisease || '',
                          pastOperation: updatedPatient.pastOperation || '',
                          patientPrivacyPermission: updatedPatient.patientPrivacyPermission || 'no',
                          patientImage: updatedPatient.patientImage || null
                        })
                      }
                      
                      setEditPatientNote('')
                      toast.success('Note added successfully!')
                    } catch (error) {
                      console.error('Error adding note:', error)
                      toast.error('Failed to add note')
                    } finally {
                      setIsAddingEditNote(false)
                    }
                  }}
                  disabled={isAddingEditNote || !editPatientNote.trim()}
                  className="mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isAddingEditNote ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Note</span>
                  )}
                </button>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedPatient(null)
                    setModalType('')
                    setPatientImagePreview(null)
                    setEditPatientNote('')
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

      {/* Add Doctor Modal */}
      <Modal
        isOpen={showAddDoctorModal}
        onClose={() => {
          setShowAddDoctorModal(false)
          resetDoctorForm()
        }}
        title="Add Doctor"
        size="lg"
      >
        <form ref={doctorFormRef} onSubmit={handleAddDoctor} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              name="name"
              type="text"
              value={doctorForm.name}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Doctor full name"
              required
            />
            <FormInput
              label="Post / Designation"
              name="post"
              type="text"
              value={doctorForm.post}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, post: e.target.value }))}
              placeholder="e.g. Consultant, Senior Resident"
              required
            />
            <FormInput
              label="Years of Experience"
              name="yearsOfExperience"
              type="number"
              min="0"
              value={doctorForm.yearsOfExperience}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, yearsOfExperience: e.target.value }))}
              placeholder="0"
              required
            />
            <FormInput
              label="Qualifications (comma-separated)"
              name="qualifications"
              type="text"
              value={doctorForm.qualifications}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, qualifications: e.target.value }))}
              placeholder="e.g. MBBS, MD, DM"
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={doctorForm.email}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Optional"
            />
            <FormInput
              label="Phone"
              name="phone"
              type="text"
              value={doctorForm.phone}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
            <div className="flex items-center space-x-4">
              {doctorPhotoPreview ? (
                <div className="relative">
                  <img
                    src={doctorPhotoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDoctorForm(prev => ({ ...prev, profilePhoto: null }))
                      setDoctorPhotoPreview(null)
                      if (doctorImageInputRef.current) doctorImageInputRef.current.value = ''
                    }}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
              <div>
                <input
                  ref={doctorImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDoctorPhotoChange}
                  className="hidden"
                  id="doctor-photo-input"
                />
                <label
                  htmlFor="doctor-photo-input"
                  className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{doctorPhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddDoctorModal(false)
                resetDoctorForm()
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAddingDoctor}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isAddingDoctor ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Doctor</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal
        isOpen={showEditDoctorModal}
        onClose={() => {
          setShowEditDoctorModal(false)
          setSelectedDoctor(null)
          resetDoctorForm()
        }}
        title="Edit Doctor"
        size="lg"
      >
        <form onSubmit={handleUpdateDoctor} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Name"
              name="name"
              type="text"
              value={doctorForm.name}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Doctor full name"
              required
            />
            <FormInput
              label="Post / Designation"
              name="post"
              type="text"
              value={doctorForm.post}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, post: e.target.value }))}
              placeholder="e.g. Consultant, Senior Resident"
              required
            />
            <FormInput
              label="Years of Experience"
              name="yearsOfExperience"
              type="number"
              min="0"
              value={doctorForm.yearsOfExperience}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, yearsOfExperience: e.target.value }))}
              placeholder="0"
              required
            />
            <FormInput
              label="Qualifications (comma-separated)"
              name="qualifications"
              type="text"
              value={doctorForm.qualifications}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, qualifications: e.target.value }))}
              placeholder="e.g. MBBS, MD, DM"
            />
            <FormInput
              label="Email"
              name="email"
              type="email"
              value={doctorForm.email}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Optional"
            />
            <FormInput
              label="Phone"
              name="phone"
              type="text"
              value={doctorForm.phone}
              onChange={(e) => setDoctorForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
            <div className="flex items-center space-x-4">
              {doctorPhotoPreview ? (
                <div className="relative">
                  <img
                    src={doctorPhotoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDoctorForm(prev => ({ ...prev, profilePhoto: null }))
                      setDoctorPhotoPreview(null)
                      if (editDoctorImageInputRef.current) editDoctorImageInputRef.current.value = ''
                    }}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
              <div>
                <input
                  ref={editDoctorImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleDoctorPhotoChange}
                  className="hidden"
                  id="edit-doctor-photo-input"
                />
                <label
                  htmlFor="edit-doctor-photo-input"
                  className="inline-flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{doctorPhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditDoctorModal(false)
                setSelectedDoctor(null)
                resetDoctorForm()
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingDoctor}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUpdatingDoctor ? (
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

      {/* OTP Verification Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => {
          setShowOtpModal(false)
          setOtpData({ email: '', otp: '', patientId: null, patientData: null })
        }}
        title="OTP Verification"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              An OTP has been sent to <strong>{otpData.email}</strong>. Please enter the OTP to verify and link this hospital to the patient.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={otpData.otp}
              onChange={(e) => setOtpData({ ...otpData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowOtpModal(false)
                setOtpData({ email: '', otp: '', patientId: null, patientData: null })
              }}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSendOtp(otpData.email)}
              disabled={isSendingOtp}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg disabled:opacity-50"
            >
              {isSendingOtp ? 'Sending...' : 'Resend OTP'}
            </button>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpData.otp.length !== 6}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isVerifyingOtp ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify OTP</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default HospitalDashboard
