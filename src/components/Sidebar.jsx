import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  UserPlus,
  Shield,
  Activity,
  AlertTriangle,
  Heart
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const Sidebar = ({ activeTab, setActiveTab, userType }) => {
  const { logout, userData } = useAuth()

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'hospitals', label: 'Hospital Management', icon: Building2 },
    { id: 'register', label: 'Register Hospital', icon: UserPlus },
    { id: 'logs', label: 'Logs', icon: FileText }
  ]

  const hospitalTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'add-patient', label: 'Add Patient', icon: UserPlus },
    { id: 'manage-patients', label: 'Manage Patients', icon: Users },
    { id: 'access-patient', label: 'Access Patient', icon: Shield },
    { id: 'emergency', label: 'Emergency Override', icon: AlertTriangle },
    { id: 'profile', label: 'Profile', icon: Settings }
  ]

  const tabs = userType === 'admin' ? adminTabs : hospitalTabs

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-40"
    >
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">BioPrint AI</h1>
            <p className="text-sm text-gray-500 capitalize">{userType} Dashboard</p>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {userData?.adminName?.charAt(0) || userData?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                {userData?.adminName || userData?.name || 'User'}
              </p>
              <p className="text-sm text-gray-500">{userData?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </motion.button>
            )
          })}
        </nav>

        {/* Logout Button */}
        <motion.button
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200 mt-8"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </motion.button>
      </div>
    </motion.div>
  )
}

export default Sidebar
