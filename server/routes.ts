import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertProductSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Orders API
  app.get("/api/orders", async (req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    const result = insertOrderSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const order = await storage.createOrder(result.data);
    res.json(order);
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    const result = insertProductSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const product = await storage.createProduct(result.data);
    res.json(product);
  });

  // Production Stages API
  app.get("/api/production-stages/:orderId", async (req, res) => {
    const stages = await storage.getProductionStages(parseInt(req.params.orderId));
    res.json(stages);
  });

  app.post("/api/production-stages/:orderId/complete", async (req, res) => {
    const { stageId, userId } = req.body;
    const stage = await storage.completeProductionStage(stageId, userId);
    res.json(stage);
  });

  const httpServer = createServer(app);
  return httpServer;
}
