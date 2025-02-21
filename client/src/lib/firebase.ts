import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo các services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication functions
export const login = async (email: string, password: string) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
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
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
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

    // Tạo tài khoản admin
    const adminCredential = await register(
      "admin@demo.com",
      "admin123",
      "admin",
      "Administrator"
    );

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
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.');
    }
    throw error;
  }
};

// Firestore functions
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
