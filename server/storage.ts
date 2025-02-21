import { 
  users, type User, type InsertUser,
  orders, type Order, type InsertOrder,
  products, type Product, type InsertProduct,
  productionStages, type ProductionStage, type InsertProductionStage
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Order operations
  getOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;

  // Product operations
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;

  // Production stage operations
  getProductionStages(orderId: number): Promise<ProductionStage[]>;
  completeProductionStage(stageId: number, userId: number): Promise<ProductionStage>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  // Product operations
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  // Production stage operations
  async getProductionStages(orderId: number): Promise<ProductionStage[]> {
    return await db
      .select()
      .from(productionStages)
      .where(eq(productionStages.orderId, orderId));
  }

  async completeProductionStage(stageId: number, userId: number): Promise<ProductionStage> {
    const [stage] = await db
      .update(productionStages)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedBy: userId,
      })
      .where(eq(productionStages.id, stageId))
      .returning();
    return stage;
  }
}

export const storage = new DatabaseStorage();