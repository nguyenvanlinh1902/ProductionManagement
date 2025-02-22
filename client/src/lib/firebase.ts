import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

// Kiểm tra biến môi trường Firebase
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Khởi tạo Firebase với xử lý lỗi
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error: any) {
  console.error('Error initializing Firebase:', error.message);
  throw error;
}

// Khởi tạo các services với xử lý lỗi
export const auth = getAuth(app);
export const db = getFirestore(app);

// Hàm test kết nối Firestore
export const testFirestoreConnection = async () => {
  try {
    const testDoc = doc(db, "_test_connection", "test");
    await setDoc(testDoc, {
      timestamp: new Date().toISOString()
    });
    await getDoc(testDoc);
    console.log('Firestore connection test successful');
    return true;
  } catch (error: any) {
    console.error('Firestore connection test failed:', error.message);
    throw error;
  }
};

// Authentication functions with improved error handling
export const login = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
    }
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }
    throw error;
  }
};

export const register = async (email: string, password: string, role: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Tạo document trong collection users
    await setDoc(doc(db, "users", userCredential.user.uid), {
      email,
      role,
      name,
      createdAt: new Date().toISOString()
    });

    return userCredential;
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
    }
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email này đã được sử dụng.');
    }
    throw error;
  }
};

export const createAdminAccount = async () => {
  try {
    // Kiểm tra xem tài khoản admin đã tồn tại chưa
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const adminExists = snapshot.docs.some(doc => doc.data().role === "admin");

    if (adminExists) {
      console.log('Admin account already exists');
      return null;
    }

    console.log('Creating admin account...');

    // Tạo tài khoản admin
    const adminCredential = await register(
      "admin@demo.com",
      "admin123",
      "admin",
      "Administrator"
    );

    console.log('Admin account created successfully');

    // Tạo các công đoạn sản xuất mặc định
    const productionStages = [
      { id: "cutting", name: "Cắt", order: 1 },
      { id: "assembly", name: "May", order: 2 },
      { id: "embroidery", name: "Thêu", order: 3 },
      { id: "finishing", name: "Hoàn thiện", order: 4 },
      { id: "quality", name: "Kiểm tra chất lượng", order: 5 },
      { id: "packaging", name: "Đóng gói", order: 6 }
    ];

    await setDoc(doc(db, "settings", "productionStages"), {
      stages: productionStages,
      updatedAt: new Date().toISOString()
    });

    console.log('Production stages created successfully');

    return adminCredential;
  } catch (error: any) {
    console.error('Error creating admin account:', error);
    // Không throw error ở đây để tránh block luồng khởi tạo app
    return null;
  }
};

export const logout = async () => {
  try {
    return await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
    }
    throw error;
  }
};

// Firestore functions with improved error handling
export const getUserRole = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data().role;
    }
    return null;
  } catch (error: any) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const getProductionStages = async () => {
  try {
    const stagesDoc = await getDoc(doc(db, "settings", "productionStages"));
    if (stagesDoc.exists()) {
      return stagesDoc.data().stages;
    }
    return [];
  } catch (error: any) {
    console.error('Error getting production stages:', error);
    return [];
  }
};