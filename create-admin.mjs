import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const adminCredential = await createUserWithEmailAndPassword(
      auth,
      'linhnv@gmail.com',
      'admin123'
    );

    await setDoc(doc(db, 'users', adminCredential.user.uid), {
      email: 'linhnv@gmail.com',
      role: 'admin',
      name: 'Administrator',
      createdAt: new Date().toISOString()
    });

    console.log('Admin account created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();