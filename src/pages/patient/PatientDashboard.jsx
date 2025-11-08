import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  User, 
  Heart, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Building2,
  Stethoscope,
  Clock
} from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import toast from 'react-hot-toast'

const PatientDashboard = () => {
  const [patientData, setPatientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  const { email, verified } = location.state || {}

  useEffect(() => {
    if (!email || !verified) {
      toast.error('Unauthorized access')
      return
    }
    fetchPatientData()
  }, [email, verified])

  const fetchPatientData = async () => {
    setLoading(true)
    try {
      const patientsQuery = query(
        collection(db, 'patient'),
        where('email', '==', email)
      )
      const patientsSnapshot = await getDocs(patientsQuery)
      
      if (patientsSnapshot.empty) {
        toast.error('No patient record found')
        return
      }

      const patient = patientsSnapshot.docs[0].data()
      setPatientData(patient)
    } catch (error) {
      console.error('Error fetching patient data:', error)
      toast.error('Failed to fetch patient data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your medical records...</p>
        </div>
      </div>
    )
  }

  if (!patientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Records Found</h2>
          <p className="text-gray-600 mb-6">No medical records found for this email address.</p>
          <Link
            to="/patient-login"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    )
  }

  // Collect all notes from all hospitals
  const getAllNotes = () => {
    if (!patientData?.hospitalRecords) return []
    
    const allNotes = []
    Object.entries(patientData.hospitalRecords).forEach(([hospitalId, record]) => {
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
    return allNotes
  }

  const allNotes = getAllNotes()

  // Get associated hospitals info
  const getAssociatedHospitals = () => {
    if (!patientData?.hospitalRecords) return []
    
    const hospitals = []
    Object.entries(patientData.hospitalRecords).forEach(([hospitalId, record]) => {
      hospitals.push({
        hospitalId,
        hospitalName: record?.hospitalName || 'Unknown Hospital',
        linkedAt: record?.linkedAt || 'N/A',
        lastAccessed: record?.lastAccessed || 'N/A',
        notesCount: record?.notes?.length || 0
      })
    })
    
    return hospitals
  }

  const associatedHospitals = getAssociatedHospitals()

  const medicalInfo = [
    {
      label: 'Blood Group',
      value: patientData.bloodGroup,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      label: 'Allergies',
      value: patientData.anyAllergy || 'None reported',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: 'Diseases',
      value: patientData.anyDisease || 'None reported',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      label: 'Past Operations',
      value: patientData.pastOperation || 'None reported',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Privacy Permission',
      value: patientData.patientPrivacyPermission === 'yes' ? 'Allowed' : 'Restricted',
      icon: Shield,
      color: patientData.patientPrivacyPermission === 'yes' ? 'text-green-600' : 'text-red-600',
      bgColor: patientData.patientPrivacyPermission === 'yes' ? 'bg-green-100' : 'bg-red-100'
    }
  ]

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
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Medical Records</h1>
            <p className="text-gray-600">Your personal medical information</p>
          </div>

          {/* Patient Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-xl p-8 mb-8"
          >
            {/* Patient Image */}
            <div className="flex justify-center mb-6">
              {patientData.patientImage ? (
                <img 
                  src={patientData.patientImage} 
                  alt={patientData.patientName || 'Patient'} 
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-200">
                  <User className="w-16 h-16 text-blue-600" />
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">{patientData.patientName || 'Patient'}</h2>
                <p className="text-gray-600">Personal details and contact information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Aadhaar Number</p>
                    <p className="font-semibold text-gray-800">{patientData.aadharNumber}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-semibold text-gray-800">{patientData.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Mobile Number</p>
                    <p className="font-semibold text-gray-800">{patientData.mobileNumber}</p>
                  </div>
                </div>

                {patientData.relativesNumber && (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Relatives Number</p>
                      <p className="font-semibold text-gray-800">{patientData.relativesNumber}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Record Created</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(patientData.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Medical Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-xl p-8 mb-8"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Heart className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Medical Information</h2>
                <p className="text-gray-600">Important medical details and history</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {medicalInfo.map((info, index) => {
                const Icon = info.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className={`w-12 h-12 ${info.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${info.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 mb-1">{info.label}</p>
                      <p className="text-lg font-semibold text-gray-800">{info.value}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Associated Hospitals */}
          {associatedHospitals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-2xl shadow-xl p-8 mb-8"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Associated Hospitals</h2>
                  <p className="text-gray-600">Hospitals with access to your medical records</p>
                </div>
              </div>

              <div className="space-y-4">
                {associatedHospitals.map((hospital, index) => (
                  <motion.div
                    key={hospital.hospitalId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">{hospital.hospitalName}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Linked:</span>{' '}
                            {hospital.linkedAt !== 'N/A' 
                              ? new Date(hospital.linkedAt).toLocaleDateString() 
                              : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Last Accessed:</span>{' '}
                            {hospital.lastAccessed !== 'N/A' 
                              ? new Date(hospital.lastAccessed).toLocaleDateString() 
                              : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Notes:</span> {hospital.notesCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Treatment Notes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white rounded-2xl shadow-xl p-8 mb-8"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Treatment Notes</h2>
                <p className="text-gray-600">Medical notes from all associated hospitals</p>
              </div>
            </div>

            {allNotes.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No treatment notes available yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {allNotes.map((note) => (
                  <motion.div
                    key={note.uniqueKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{note.hospitalName || 'Unknown Hospital'}</h3>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(note.addedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Additional Patient Information */}
          {(patientData.patientId || patientData.fingerprintSlotNumber || patientData.primaryHospital) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 mb-8"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Additional Information</h2>
                  <p className="text-gray-600">System and record details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {patientData.patientId && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Patient ID</p>
                    <p className="font-semibold text-gray-800">{patientData.patientId}</p>
                  </div>
                )}
                {patientData.fingerprintSlotNumber && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Fingerprint Slot</p>
                    <p className="font-semibold text-gray-800">{patientData.fingerprintSlotNumber}</p>
                  </div>
                )}
                {patientData.primaryHospital && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Primary Hospital</p>
                    <p className="font-semibold text-gray-800">{patientData.primaryHospital}</p>
                  </div>
                )}
                {patientData.updatedAt && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Last Updated</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(patientData.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Security Notice</h3>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Your medical records are protected and can only be accessed by authorized healthcare providers. 
                  All access attempts are logged and monitored for security purposes. If you notice any unauthorized 
                  access to your records, please contact your healthcare provider immediately.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-center"
          >
            <Link
              to="/patient-login"
              className="inline-flex items-center space-x-2 bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default PatientDashboard
