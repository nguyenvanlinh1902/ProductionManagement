import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo các services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication functions
export const login = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const register = async (email: string, password: string, role: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Tạo document trong collection users
  await setDoc(doc(db, "users", userCredential.user.uid), {
    email,
    role,
    name,
    createdAt: new Date().toISOString()
  });

  return userCredential;
};

export const createAdminAccount = async () => {
  try {
    // Thử tạo tài khoản admin
    const adminCredential = await register(
      "admin@demo.com",
      "admin123",
      "admin",
      "Administrator"
    );

    // Tạo các công đoạn sản xuất mặc định
    const productionStages = [
      { id: "cutting", name: "Cắt", order: 1 },
      { id: "assembly", name: "Lắp ráp", order: 2 },
      { id: "finishing", name: "Hoàn thiện", order: 3 },
      { id: "quality", name: "Kiểm tra chất lượng", order: 4 }
    ];

    await setDoc(doc(db, "settings", "productionStages"), {
      stages: productionStages,
      updatedAt: new Date().toISOString()
    });

    return adminCredential;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin account already exists');
      return null;
    }
    throw error;
  }
};

export const logout = async () => {
  return signOut(auth);
};

// Firestore functions
export const getUserRole = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data().role;
  }
  return null;
};

export const getProductionStages = async () => {
  const stagesDoc = await getDoc(doc(db, "settings", "productionStages"));
  if (stagesDoc.exists()) {
    return stagesDoc.data().stages;
  }
  return [];
};