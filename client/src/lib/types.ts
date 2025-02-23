import { z } from "zod";

export interface EmbroideryPosition {
  name: string;
  description: string;
  designUrl?: string;
  status: 'pending' | 'in_progress' | 'completed'; // Added status field
}

export interface Product {
  name: string;
  quantity: number;
  price: number;
  sku: string;
  color: string;
  size: string;
  embroideryPositions: EmbroideryPosition[];
  manufactured?: boolean; // Add manufactured flag
}

export interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface ProductionStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface ShopifyOrder {
  id: string;
  orderNumber: string;
  customer: Customer;
  products: Product[];
  stages: ProductionStage[];
  status: 'pending' | 'in_production' | 'completed';
  notes: string;
  createdAt: string;
  deadline: string | null;
  total: number;
  qrCode: string | null;
  complexity: 'simple' | 'medium' | 'complex' | 'very_complex';
}

// Zod schemas
export const embroideryPositionSchema = z.object({
  name: z.string(),
  description: z.string(),
  designUrl: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed'])
});

export const productSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  sku: z.string(),
  color: z.string(),
  size: z.string(),
  embroideryPositions: z.array(embroideryPositionSchema),
  manufactured: z.boolean().optional()
});

export const customerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string()
});

export const productionStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional()
});

export const shopifyOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: customerSchema,
  products: z.array(productSchema),
  stages: z.array(productionStageSchema),
  status: z.enum(['pending', 'in_production', 'completed']),
  notes: z.string(),
  createdAt: z.string(),
  deadline: z.string().nullable(),
  total: z.number(),
  qrCode: z.string().nullable(),
  complexity: z.enum(['simple', 'medium', 'complex', 'very_complex'])
});