import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
export const storage = getStorage(app);

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase persistence set to LOCAL');
  })
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

export const createAdminAccount = async () => {
  try {
    console.log('Starting admin account creation process...');

    // Kiểm tra xem tài khoản admin đã tồn tại chưa
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    // Xóa tất cả tài khoản admin cũ nếu có lỗi
    for (const doc of snapshot.docs) {
      const userData = doc.data();
      if (userData.role === 'admin') {
        console.log('Removing old admin account:', doc.id);
        await deleteDoc(doc.ref);
      }
    }

    console.log('Creating new admin account...');

    // Tạo tài khoản admin mới
    const adminCredential = await createUserWithEmailAndPassword(
      auth,
      "admin@demo.com",
      "admin123"
    );

    console.log('Admin auth account created, setting up user document...');

    // Tạo document trong collection users
    await setDoc(doc(db, "users", adminCredential.user.uid), {
      email: "admin@demo.com",
      role: "admin",
      name: "Administrator",
      createdAt: new Date().toISOString()
    });

    console.log('Admin user document created successfully');

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
    console.log('Admin account setup completed successfully');

    return adminCredential;
  } catch (error: any) {
    console.error('Error in createAdminAccount:', error);
    if (error.code === 'auth/email-already-in-use') {
      // Nếu email đã tồn tại, thử đăng nhập
      try {
        console.log('Admin email exists, attempting to sign in...');
        const credential = await signInWithEmailAndPassword(auth, "admin@demo.com", "admin123");
        return credential;
      } catch (signInError: any) {
        console.error('Error signing in as admin:', signInError);
        throw signInError;
      }
    }
    throw error;
  }
};

// Authentication functions with improved error handling
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

    if (!userDoc.exists()) {
      throw new Error('Không tìm thấy thông tin người dùng');
    }

    return userCredential;
  } catch (error: any) {
    console.error('Login error:', error);
    switch (error.code) {
      case 'auth/invalid-email':
        throw new Error('Email không hợp lệ');
      case 'auth/user-disabled':
        throw new Error('Tài khoản đã bị vô hiệu hóa');
      case 'auth/user-not-found':
        throw new Error('Không tìm thấy tài khoản với email này');
      case 'auth/wrong-password':
        throw new Error('Mật khẩu không đúng');
      case 'auth/invalid-credential':
        throw new Error('Email hoặc mật khẩu không đúng');
      case 'auth/network-request-failed':
        throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
      case 'auth/too-many-requests':
        throw new Error('Quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau');
      default:
        throw new Error('Lỗi đăng nhập: ' + error.message);
    }
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
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email này đã được sử dụng.');
    }
    throw error;
  }
};


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

export const logout = async () => {
  try {
    await signOut(auth);
    // Clear any local session data
    localStorage.clear();
    sessionStorage.clear();
    return true;
  } catch (error: any) {
    console.error('Logout error:', error);
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