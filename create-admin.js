import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminAccount() {
  try {
    console.log('Starting admin account creation...');

    // Create auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'linhnv@gmail.com',
      'admin123'
    );

    console.log('Auth account created, creating user document...');

    // Add user document
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: 'linhnv@gmail.com',
      role: 'admin',
      name: 'Administrator',
      createdAt: new Date().toISOString()
    });

    console.log('Admin account created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin account:', error.message);
    if (error.code === 'auth/email-already-in-use') {
      console.log('Email already exists - this is okay, you can use this account');
      process.exit(0);
    }
    process.exit(1);
  }
}

createAdminAccount();