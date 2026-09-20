import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

// Firebase configuration from environment variables
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}')

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = initializeFirestore(app, {}, 'investment')

// Initialize Firebase Auth
export const auth = getAuth(app)
export const googleAuthProvider = new GoogleAuthProvider()

export default app
