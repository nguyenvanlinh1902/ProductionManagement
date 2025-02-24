
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from './firebase.js';
import type { User, Order, Product, ProductionStage } from '@shared/schema';

export interface IStorage {
  // User operations
  getUser(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: User): Promise<User>;

  // Order operations  
  getOrders(): Promise<Order[]>;
  createOrder(order: Omit<Order, 'id'>): Promise<Order>;

  // Product operations
  getProducts(): Promise<Product[]>;
  createProduct(product: Omit<Product, 'id'>): Promise<Product>;

  // Production stage operations
  getProductionStages(orderId: string): Promise<ProductionStage[]>;
  completeProductionStage(stageId: string, userId: string): Promise<ProductionStage>;
}

export class FirebaseStorage implements IStorage {
  // User operations
  async getUser(uid: string): Promise<User | undefined> {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() as User : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    return !snapshot.empty ? snapshot.docs[0].data() as User : undefined;
  }

  async createUser(user: User): Promise<User> {
    await setDoc(doc(db, 'users', user.uid), user);
    return user;
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    const snapshot = await getDocs(collection(db, 'orders'));
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Order));
  }

  async createOrder(order: Omit<Order, 'id'>): Promise<Order> {
    const docRef = await addDoc(collection(db, 'orders'), order);
    return {id: docRef.id, ...order};
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    const snapshot = await getDocs(collection(db, 'products'));
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Product));
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const docRef = await addDoc(collection(db, 'products'), product);
    return {id: docRef.id, ...product};
  }

  // Production stage operations
  async getProductionStages(orderId: string): Promise<ProductionStage[]> {
    const q = query(collection(db, 'productionStages'), where('orderId', '==', orderId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as ProductionStage));
  }

  async completeProductionStage(stageId: string, userId: string): Promise<ProductionStage> {
    const stageRef = doc(db, 'productionStages', stageId);
    const update = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedBy: userId
    };
    await updateDoc(stageRef, update);
    const stageDoc = await getDoc(stageRef);
    return {id: stageId, ...stageDoc.data()} as ProductionStage;
  }
}

export const storage = new FirebaseStorage();
