import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  Target,
  BarChart3,
  RefreshCw,
  Heart,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'

const Results = () => {
  const [results, setResults] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedResults = localStorage.getItem('predictionResults')
    if (storedResults) {
      setResults(JSON.parse(storedResults))
      setIsLoading(false)
    } else {
      toast.error('No results found. Please upload an image first.')
      navigate('/upload')
    }
  }, [navigate])

  const handleNewUpload = () => {
    navigate('/upload')
  }

  const handleDownload = () => {
    if (!results) return
    
    const reportData = {
      timestamp: new Date().toISOString(),
      vgg16: results.predictions.vgg16,
      mobilenetv2: results.predictions.mobilenetv2,
      agreement: results.predictions.agreement,
      final_prediction: results.predictions.final_prediction
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blood-group-report-${new Date().getTime()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Report downloaded successfully!')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blood Group Detection Results',
          text: `My blood group detected as ${results.predictions.final_prediction} using BioPrint AI`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      navigator.clipboard.writeText(`My blood group detected as ${results.predictions.final_prediction} using BioPrint AI`)
      toast.success('Results copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Results Found</h2>
          <p className="text-gray-600 mb-6">Please upload an image first to get your blood group prediction.</p>
          <button
            onClick={handleNewUpload}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Upload Image
          </button>
        </div>
      </div>
    )
  }

  const { predictions } = results
  const isAgreement = predictions.agreement.includes('agree')

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Upload</span>
            </button>
            
            <div className="flex space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-600 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-600 rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </motion.button>
            </div>
          </div>

          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Blood Group{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Detection Results
              </span>
            </h1>
            <p className="text-xl text-gray-600">
              AI-powered analysis using dual deep learning models
            </p>
          </div>
        </motion.div>

        {/* Main Results */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
        >
          {/* VGG16 Results */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">VGG16 Model</h3>
                <p className="text-gray-600">Convolutional Neural Network</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {predictions.vgg16.blood_group}
              </div>
              <div className="text-2xl font-semibold text-gray-700 mb-4">
                {predictions.vgg16.confidence}% Confidence
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${predictions.vgg16.confidence}%` }}
                ></div>
              </div>
            </div>
          </motion.div>

          {/* MobileNetV2 Results */}
          <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800">MobileNetV2</h3>
                <p className="text-gray-600">Lightweight CNN</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-bold text-green-600 mb-2">
                {predictions.mobilenetv2.blood_group}
              </div>
              <div className="text-2xl font-semibold text-gray-700 mb-4">
                {predictions.mobilenetv2.confidence}% Confidence
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${predictions.mobilenetv2.confidence}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Agreement Status */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-12"
        >
          <div className={`rounded-2xl p-8 text-center ${
            isAgreement 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
              : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200'
          }`}>
            <div className="flex items-center justify-center space-x-3 mb-4">
              {isAgreement ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              )}
              <h3 className="text-2xl font-bold text-gray-800">
                {isAgreement ? 'Models Agree!' : 'Models Disagree'}
              </h3>
            </div>
            <p className="text-lg text-gray-600 mb-4">
              {predictions.agreement}
            </p>
            <div className="text-3xl font-bold text-gray-800">
              Final Prediction: <span className="text-blue-600">{predictions.final_prediction}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNewUpload}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Upload Another Image</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-2 border border-gray-200"
          >
            <Target className="w-5 h-5" />
            <span>Back to Home</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export default Results
