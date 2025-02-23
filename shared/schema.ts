import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  role: text("role", { enum: ['admin', 'worker', 'manager', 'machine_manager'] }).notNull(),
  name: text("name").notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customer: text("customer").notNull(),
  products: json("products").notNull(),
  status: text("status").notNull(),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").notNull(),
  quantity: integer("quantity").notNull(),
});

export const productionStages = pgTable("production_stages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  stage: text("stage").notNull(),
  status: text("status").notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertOrderSchema = createInsertSchema(orders);
export const insertProductSchema = createInsertSchema(products);
export const insertProductionStageSchema = createInsertSchema(productionStages);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductionStage = typeof productionStages.$inferSelect;
export type InsertProductionStage = z.infer<typeof insertProductionStageSchema>;
