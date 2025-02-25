import { z } from "zod";

// User schema
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'worker', 'manager', 'machine_manager', 'machine_monitor']),
  name: z.string(),
  createdAt: z.string()
});

// Machine types
export const machineTypeSchema = z.enum(['DTF_PRINTING', 'DTG_PRINTING']);

// Production Types
export const productTypeSchema = z.enum(['EMBROIDERY', 'DTF_PRINTING', 'DTG_PRINTING']);

// Production steps
export const embroideryStepSchema = z.enum([
  'PREPARATION',
  'EMBROIDERY_OUTLINE',
  'EMBROIDERY_FILL',
  'EMBROIDERY_DETAILS',
  'QUALITY_CHECK'
]);

export const printingStepSchema = z.enum([
  'FILE_PREPARATION',
  'PRINTING',
  'HEAT_PRESS',
  'QUALITY_CHECK'
]);

// Locations schema based on product type
export const embroideryLocationSchema = z.enum([
  'LEFT_CHEST',
  'RIGHT_CHEST',
  'CENTERED',
  'LARGE_CENTER',
  'LEFT_SLEEVE',
  'RIGHT_SLEEVE',
  'SPECIAL_LOCATION'
]);

export const printingLocationSchema = z.enum([
  'LEFT_CHEST',
  'CENTERED',
  'LARGE_CENTER',
  'LEFT_SLEEVE',
  'RIGHT_SLEEVE',
  'BACK_LOCATION',
  'SPECIAL_LOCATION'
]);

// Production details based on type
export const embroideryDetailsSchema = z.object({
  type: z.literal('EMBROIDERY'),
  mainLocation: embroideryLocationSchema,
  additionalLocations: z.array(embroideryLocationSchema).optional(),
  designUrl: z.string().optional(),
  mockupUrl: z.string().optional(),
  hasEmbroideryFile: z.boolean().default(false),
  currentStep: embroideryStepSchema.optional(),
  assignedWorker: z.string().optional(),
  completedSteps: z.array(embroideryStepSchema).default([])
});

export const printingDetailsSchema = z.object({
  type: z.enum(['DTF_PRINTING', 'DTG_PRINTING']),
  mainLocation: printingLocationSchema,
  additionalLocations: z.array(printingLocationSchema).optional(),
  designUrl: z.string().optional(),
  mockupUrl: z.string().optional(),
  hasPrintingFile: z.boolean().default(false),
  currentStep: printingStepSchema.optional(),
  assignedMachine: z.string().optional(),
  completedSteps: z.array(printingStepSchema).default([])
});

// Combined production details
export const productionDetailsSchema = z.discriminatedUnion('type', [
  embroideryDetailsSchema,
  printingDetailsSchema
]);

// Machine schema
export const machineSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: machineTypeSchema,
  status: z.enum(['idle', 'working', 'maintenance']),
  currentProductId: z.string().optional(),
  currentProductName: z.string().optional(),
  managerId: z.string(),
  managerName: z.string(),
  startTime: z.string().optional(),
  estimatedEndTime: z.string().optional()
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  color: z.string(),
  size: z.string(),
  productionDetails: productionDetailsSchema,
  quantity: z.number(),
  status: z.enum(['pending', 'in_production', 'completed']).default('pending')
});

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.string(),
  products: z.array(productSchema),
  salesChannel: z.string(),
  status: z.enum(['pending', 'in_production', 'completed']),
  qrCode: z.string().optional(),
  designUrls: z.array(z.string()),
  priority: z.number().default(0),
  createdAt: z.string(),
  estimatedCompletionTime: z.string().optional()
});

export const insertProductSchema = productSchema.omit({
  id: true,
  status: true
});

export const insertOrderSchema = orderSchema.omit({ 
  id: true,
  qrCode: true,
  createdAt: true,
  status: true,
  priority: true
});

export const productionStageSchema = z.object({
  id: z.string(),
  productId: z.string(),
  type: productTypeSchema,
  step: z.union([embroideryStepSchema, printingStepSchema]),
  status: z.enum(['pending', 'in_progress', 'completed']),
  assignedTo: z.string(),
  assignedName: z.string(),
  startTime: z.string().optional(),
  completedAt: z.string().optional(),
  notes: z.string().optional()
});

// Types
export type User = z.infer<typeof userSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductionStage = z.infer<typeof productionStageSchema>;
export type ProductType = z.infer<typeof productTypeSchema>;
export type MachineType = z.infer<typeof machineTypeSchema>;
export type EmbroideryLocation = z.infer<typeof embroideryLocationSchema>;
export type PrintingLocation = z.infer<typeof printingLocationSchema>;
export type ProductionDetails = z.infer<typeof productionDetailsSchema>;
export type Machine = z.infer<typeof machineSchema>;
