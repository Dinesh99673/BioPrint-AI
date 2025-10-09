import { createContext, useEffect, useState } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import toast from 'react-hot-toast'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        // Fetch user data from Firestore - try both admin and hospital collections
        try {
          // First try hospital collection
          let userDoc = await getDoc(doc(db, 'hospital', user.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data())
          } else {
            // If not found in hospital, try admin collection
            userDoc = await getDoc(doc(db, 'admin', user.uid))
            if (userDoc.exists()) {
              setUserData(userDoc.data())
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Login function
  const login = async (email, password, userType) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Fetch user data from appropriate collection using Firebase UID as document ID
      const collectionName = userType === 'admin' ? 'admin' : 'hospital'
      const userDoc = await getDoc(doc(db, collectionName, user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserData(userData)
        return { success: true, user: userData }
      } else {
        throw new Error('User data not found. Please contact support.')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  // Register function
  const register = async (email, password, userData, userType) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      // Save user data to appropriate collection using Firebase UID as document ID
      const collectionName = userType === 'admin' ? 'admin' : 'hospital'
      const userDocData = {
        ...userData,
        email,
        firebaseUid: user.uid, // Store Firebase UID for reference
        createdAt: new Date().toISOString()
      }
      
      await setDoc(doc(db, collectionName, user.uid), userDocData)
      setUserData(userDocData)
      
      return { success: true, user: userDocData }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
      setUserData(null)
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    }
  }

  // Update user data
  const updateUserData = async (newData) => {
    try {
      if (!user) throw new Error('No user logged in')
      
      // Determine collection based on user data structure
      const collectionName = userData?.adminId ? 'admin' : 'hospital'
      await updateDoc(doc(db, collectionName, user.uid), newData)
      
      setUserData(prev => ({ ...prev, ...newData }))
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Error updating profile')
    }
  }

  // Create log entry
  const createLog = async (logData) => {
    try {
      const logId = Date.now().toString()
      const logEntry = {
        logId,
        timestamp: new Date().toISOString(),
        ...logData
      }
      
      await setDoc(doc(db, 'logs', logId), logEntry)
    } catch (error) {
      console.error('Error creating log:', error)
    }
  }

  const value = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    updateUserData,
    createLog
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
