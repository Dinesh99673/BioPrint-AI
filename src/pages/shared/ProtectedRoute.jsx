import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Loader from '../../components/Loader'

const ProtectedRoute = ({ children, requiredUserType = null }) => {
  const { user, userData, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loader />
  }

  if (!user) {
    // Redirect to appropriate login page
    const loginPath = requiredUserType === 'admin' ? '/admin-login' : '/hospital-login'
    return <Navigate to={loginPath} state={{ from: location }} replace />
  }

  if (requiredUserType && userData) {
    // Check if user has the required type
    const userType = userData.adminId ? 'admin' : 'hospital'
    if (userType !== requiredUserType) {
      // Redirect to appropriate dashboard
      const dashboardPath = userType === 'admin' ? '/admin/dashboard' : '/hospital/dashboard'
      return <Navigate to={dashboardPath} replace />
    }
  }

  return children
}

export default ProtectedRoute
