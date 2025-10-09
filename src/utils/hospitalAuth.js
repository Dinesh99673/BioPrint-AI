/**
 * Hospital Authentication utilities
 */

import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'

/**
 * Clean up generated password from hospital document after first login
 * This should be called when hospital changes their password
 * hospitalId should be the Firebase UID (document ID)
 */
export const cleanupGeneratedPassword = async (hospitalId) => {
  try {
    await updateDoc(doc(db, 'hospital', hospitalId), {
      generatedPassword: null,
      passwordGeneratedAt: null,
      passwordChangedAt: new Date().toISOString()
    })
    console.log('Generated password cleaned up for hospital:', hospitalId)
  } catch (error) {
    console.error('Error cleaning up generated password:', error)
    throw error
  }
}

/**
 * Check if hospital is using a generated password (needs to change it)
 */
export const isUsingGeneratedPassword = (hospitalData) => {
  return hospitalData.generatedPassword && !hospitalData.passwordChangedAt
}

/**
 * Get password security requirements
 */
export const getPasswordRequirements = () => {
  return {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    message: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
  }
}

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  const requirements = getPasswordRequirements()
  const errors = []
  
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`)
  }
  
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (requirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
