import { z } from "zod";

// Validation schemas
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'worker', 'manager', 'machine_manager', 'machine_monitor']),
  name: z.string(),
  createdAt: z.string()
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string(),
  quantity: z.number()
});

export const insertProductSchema = productSchema.omit({
  id: true
});

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.string(),
  products: z.array(z.any()),
  status: z.string(),
  qrCode: z.string().optional(),
  createdAt: z.string()
});

export const insertOrderSchema = orderSchema.omit({ 
  id: true,
  qrCode: true,
  createdAt: true 
});

export const productionStageSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  stage: z.string(),
  status: z.string(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional()
});

// Types
export type User = z.infer<typeof userSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductionStage = z.infer<typeof productionStageSchema>;