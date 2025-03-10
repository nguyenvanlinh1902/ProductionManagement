import { z } from "zod";

export interface EmbroideryPosition {
  name: string;
  description: string;
  designUrl?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Product {
  name: string;
  quantity: number;
  price: number;
  sku: string;
  color: string;
  size: string;
  embroideryPositions: EmbroideryPosition[];
  manufactured?: boolean;
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

export interface SewingMachine {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  status: 'idle' | 'working' | 'maintenance';
  currentThreadColor?: string;
  currentProductId?: string;
  currentProductName?: string;
  startTime?: string;
  estimatedEndTime?: string;
}

export interface MachineHistory {
  id: string;
  machineId: string;
  productId: string;
  threadColor: string;
  startTime: string;
  endTime: string;
  status: 'completed' | 'interrupted' | 'maintenance';
  notes?: string;
}

export interface MachineRecommendation {
  machineId: string;
  productId: string;
  priority: number;
  reason: string;
  estimatedTime: number;
  threadColor: string;
}

// Zod schemas for new types
export const sewingMachineSchema = z.object({
  id: z.string(),
  name: z.string(),
  managerId: z.string(),
  managerName: z.string(),
  status: z.enum(['idle', 'working', 'maintenance']),
  currentThreadColor: z.string().optional(),
  currentProductId: z.string().optional(),
  currentProductName: z.string().optional(),
  startTime: z.string().optional(),
  estimatedEndTime: z.string().optional()
});

export const machineHistorySchema = z.object({
  id: z.string(),
  machineId: z.string(),
  productId: z.string(),
  threadColor: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(['completed', 'interrupted', 'maintenance']),
  notes: z.string().optional()
});

export const machineRecommendationSchema = z.object({
  machineId: z.string(),
  productId: z.string(),
  priority: z.number(),
  reason: z.string(),
  estimatedTime: z.number(),
  threadColor: z.string()
});

// Thêm các interface mới
export interface MachineGroup {
  id: string;
  name: string; 
  managerId: string;
  managerName: string;
  machineIds: string[]; 
}

export interface MachineOperation {
  id: string;
  machineId: string;
  productId: string;
  productName: string;
  threadColor: string;
  startTime: string;
  estimatedEndTime: string;
  actualEndTime?: string;
  status: 'in_progress' | 'completed' | 'delayed';
  notes?: string;
}

// Thêm Zod schemas
export const machineGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  managerId: z.string(),
  managerName: z.string(),
  machineIds: z.array(z.string())
});

export const machineOperationSchema = z.object({
  id: z.string(),
  machineId: z.string(),
  productId: z.string(),
  productName: z.string(),
  threadColor: z.string(),
  startTime: z.string(),
  estimatedEndTime: z.string(),
  actualEndTime: z.string().optional(),
  status: z.enum(['in_progress', 'completed', 'delayed']),
  notes: z.string().optional()
});

export interface OrderImport {
  productType: 'EMBROIDERY' | 'DTF_PRINTING' | 'DTG_PRINTING';
  orderNumber: string;
  customer: string;
  salesChannel: string;
  products: {
    name: string;
    sku: string;
    price: number;
    color: string;
    size: string;
    quantity: number;
    mainLocation: string;
    additionalLocations?: string[];
    designUrl?: string;
    hasProductionFile: boolean;
  }[];
}

export const orderImportSchema = z.object({
  productType: z.enum(['EMBROIDERY', 'DTF_PRINTING', 'DTG_PRINTING']),
  orderNumber: z.string(),
  customer: z.string(),
  salesChannel: z.string(),
  products: z.array(z.object({
    name: z.string(),
    sku: z.string(),
    price: z.number(),
    color: z.string(),
    size: z.string(),
    quantity: z.number(),
    mainLocation: z.string(),
    additionalLocations: z.array(z.string()).optional(),
    designUrl: z.string().optional(),
    hasProductionFile: z.boolean()
  }))
});