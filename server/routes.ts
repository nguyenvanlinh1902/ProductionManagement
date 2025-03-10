import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertProductSchema } from "@shared/schema";
import QRCode from "qrcode";

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
    const qrCode = await QRCode.toDataURL(order.id);

    await storage.updateOrder(order.id, {
      ...order,
      qrCode,
      stages: {
        cutting: { completed: false },
        sewing: { completed: false },
        packaging: { completed: false },
      },
    });

    res.json({ ...order, qrCode });
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  // Shopify Proxy API
  app.get("/api/shopify/orders", async (req, res) => {
    try {
      const shopifyUrl = `https://${process.env.VITE_SHOPIFY_STORE_URL}/admin/api/2025-01/orders.json?status=any`;
      const response = await fetch(shopifyUrl, {
        headers: {
          "X-Shopify-Access-Token": process.env.VITE_SHOPIFY_ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
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
    const stages = await storage.getProductionStages(
      parseInt(req.params.orderId),
    );
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
