import { z } from "zod";

// Validation schemas
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'worker', 'manager', 'machine_manager', 'machine_monitor']),
  name: z.string(),
  createdAt: z.string()
});

export const printingTechniqueSchema = z.enum(['DTF_PRINTING', 'DTG_PRINTING']);

export const printingLocationSchema = z.enum([
  'LEFT_CHEST',
  'CENTERED',
  'LARGE_CENTER',
  'LEFT_SLEEVE',
  'RIGHT_SLEEVE',
  'BACK_LOCATION',
  'SPECIAL_LOCATION'
]);

export const printingDetailsSchema = z.object({
  technique: printingTechniqueSchema,
  mainLocation: printingLocationSchema,
  additionalLocations: z.array(printingLocationSchema).optional(),
  designUrl: z.string().optional(),
  mockupUrl: z.string().optional(),
  hasPrintingFile: z.boolean().default(false),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  color: z.string(),
  size: z.string(),
  printingDetails: printingDetailsSchema,
  quantity: z.number()
});

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.string(),
  products: z.array(productSchema),
  salesChannel: z.string(),
  status: z.string(),
  qrCode: z.string().optional(),
  designUrls: z.array(z.string()),
  createdAt: z.string()
});

export const insertProductSchema = productSchema.omit({
  id: true
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
export type PrintingTechnique = z.infer<typeof printingTechniqueSchema>;
export type PrintingLocation = z.infer<typeof printingLocationSchema>;
export type PrintingDetails = z.infer<typeof printingDetailsSchema>;