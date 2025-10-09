import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './pages/shared/ProtectedRoute'

// Existing pages
import LandingPage from './pages/home/LandingPage'
import Home from './pages/Home'
import About from './pages/About'
import Upload from './pages/Upload'
import Results from './pages/Results'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/Dashboard'
import RegisterHospital from './pages/admin/RegisterHospital'

// Hospital pages
import HospitalLogin from './pages/hospital/HospitalLogin'
import HospitalDashboard from './pages/hospital/Dashboard'

// Patient pages
import PatientLogin from './pages/patient/PatientLogin'
import PatientVerifyOtp from './pages/patient/PatientVerifyOtp'
import PatientDashboard from './pages/patient/PatientDashboard'

import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Only show navbar on public pages */}
          <Routes>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/hospital-login" element={<HospitalLogin />} />
            <Route path="/hospital-register" element={<RegisterHospital />} />
            <Route path="/patient-login" element={<PatientLogin />} />
            <Route path="/patient-verify" element={<PatientVerifyOtp />} />
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/admin/*" element={
              <ProtectedRoute requiredUserType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/hospital/*" element={
              <ProtectedRoute requiredUserType="hospital">
                <HospitalDashboard />
              </ProtectedRoute>
            } />
            <Route path="/*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/results" element={<Results />} />
                </Routes>
              </>
            } />
          </Routes>
          
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
