import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Upload as UploadIcon, 
  Image as ImageIcon, 
  X, 
  Fingerprint, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  FileImage
} from 'lucide-react'
import toast from 'react-hot-toast'
import { predictBloodGroup, captureAndPredict } from '../utils/api'

const Upload = () => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target.result)
      reader.readAsDataURL(file)
      toast.success('Image selected successfully!')
    } else {
      toast.error('Please select a valid image file')
    }
  }

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first')
      return
    }

    setIsUploading(true)

    try {
      const response = await predictBloodGroup(selectedFile)

      if (response.success) {
        toast.success('Blood group detected successfully!')
        // Store results in localStorage for the results page
        localStorage.setItem('predictionResults', JSON.stringify(response))
        navigate('/results')
      } else {
        toast.error('Failed to detect blood group')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to connect to the server. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCaptureFromScanner = async () => {
    setIsCapturing(true)

    try {
      toast.loading('Please place your finger on the scanner...', { id: 'capture' })
      const response = await captureAndPredict()

      if (response.success) {
        toast.success('Fingerprint captured and blood group detected successfully!', { id: 'capture' })
        // Store results in localStorage for the results page
        localStorage.setItem('predictionResults', JSON.stringify(response))
        navigate('/results')
      } else {
        toast.error('Failed to detect blood group', { id: 'capture' })
      }
    } catch (error) {
      console.error('Capture error:', error)
      toast.error(error.message || 'Failed to capture fingerprint. Please try again.', { id: 'capture' })
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Upload Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Fingerprint
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload a clear image of your fingerprint and let our AI detect your blood group with high accuracy
          </p>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">Important Disclaimer</h4>
                <p className="text-sm text-yellow-700 leading-relaxed">
                  This AI system is currently in <strong>training and development phase</strong>. The blood group predictions are <strong>experimental and should not be used as the sole basis for medical decisions</strong>. Always verify results with standard laboratory testing methods. This system is intended for research and educational purposes only.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-blue-500 bg-blue-50 scale-105'
                : selectedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <AnimatePresence mode="wait">
              {!selectedFile ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="space-y-6"
                >
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
                    <UploadIcon className="w-12 h-12 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                      Drop your image here
                    </h3>
                    <p className="text-gray-600 mb-4">
                      or click to browse files
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                      <span className="px-3 py-1 bg-gray-100 rounded-full">JPG</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">PNG</span>
                      <span className="px-3 py-1 bg-gray-100 rounded-full">WEBP</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="space-y-6"
                >
                  <div className="relative inline-block">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-48 h-48 object-cover rounded-2xl shadow-lg"
                    />
                    <button
                      onClick={removeFile}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-2 flex items-center justify-center space-x-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span>Image Selected</span>
                    </h3>
                    <p className="text-gray-600">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            {selectedFile && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={uploadFile}
                disabled={isUploading || isCapturing}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span>Detect Blood Group</span>
                  </>
                )}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCaptureFromScanner}
              disabled={isCapturing || isUploading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Capture from Scanner</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: Camera,
              title: 'Take Clear Photo',
              description: 'Ensure good lighting and focus for best results',
              color: 'from-blue-500 to-cyan-500'
            },
            {
              icon: FileImage,
              title: 'Upload Image',
              description: 'Drag and drop or click to select your fingerprint image',
              color: 'from-green-500 to-emerald-500'
            },
            {
              icon: CheckCircle,
              title: 'Get Results',
              description: 'Receive instant blood group detection with confidence scores',
              color: 'from-purple-500 to-pink-500'
            }
          ].map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

export default Upload
