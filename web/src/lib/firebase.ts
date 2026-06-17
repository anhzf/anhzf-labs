import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase configuration from environment variables
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}')

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

export default app
