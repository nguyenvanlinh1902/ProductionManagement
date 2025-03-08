import { Router } from "express";
import { orderSchema } from "@shared/schema";
import { storage } from "../storage";

const router = Router();

interface ShopifyProperty {
  name: string;
  value: string;
}

interface ShopifyLineItem {
  id: number;
  title: string;
  sku: string;
  price: string;
  quantity: number;
  properties: ShopifyProperty[];
}

interface ShopifyCustomer {
  first_name: string;
  last_name: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  customer: ShopifyCustomer;
  source_name: string;
  line_items: ShopifyLineItem[];
}

router.post("/webhook/order/create", async (req, res) => {
  try {
    const shopifyOrder: ShopifyOrder = req.body;

    // Transform Shopify order to our format
    const transformedOrder = {
      id: shopifyOrder.id.toString(),
      orderNumber: shopifyOrder.order_number.toString(),
      customer: `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}`,
      salesChannel: shopifyOrder.source_name,
      status: "pending",
      products: shopifyOrder.line_items.map((item) => {
        // Parse printing details from properties
        const printingDetails = {
          technique:
            item.properties.find((p) => p.name === "Printing Techniques")
              ?.value === "DTG Printing"
              ? "DTG_PRINTING"
              : "DTF_PRINTING",
          mainLocation: parseLocation(
            item.properties.find((p) => p.name === "Font Location")?.value,
          ),
          additionalLocations: parseAdditionalLocations(
            item.properties.find((p) => p.name === "More locations")?.value,
          ),
          designUrl: item.properties.find(
            (p) => p.name === "Link Design, Mockup",
          )?.value,
          hasPrintingFile:
            item.properties.find((p) => p.name === "Printing file")?.value !==
            "No printing file",
        };

        return {
          id: item.id.toString(),
          name: item.title,
          sku: item.sku,
          price: parseFloat(item.price),
          color: item.properties.find((p) => p.name === "Color")?.value,
          size: item.properties.find((p) => p.name === "Size")?.value,
          printingDetails,
          quantity: item.quantity,
        };
      }),
      designUrls: shopifyOrder.line_items
        .map(
          (item) =>
            item.properties.find((p) => p.name === "Link Design, Mockup")
              ?.value,
        )
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    // Validate transformed order
    const validatedOrder = orderSchema.parse(transformedOrder);

    // Save to database
    await storage.createOrder(validatedOrder);

    res.status(200).json({ message: "Order processed successfully" });
  } catch (error) {
    console.error("Error processing Shopify webhook:", error);
    res.status(500).json({ error: "Failed to process order" });
  }
});

// Helper functions to parse locations
function parseLocation(location: string | undefined): PrintingLocation {
  const locationMap: Record<string, PrintingLocation> = {
    "Centered (30x40 cm)": "CENTERED",
    "Left Chest": "LEFT_CHEST",
    "Large Center (max 60 x 60 cm)": "LARGE_CENTER",
  };
  return location ? locationMap[location] || "CENTERED" : "CENTERED";
}

function parseAdditionalLocations(
  locations: string | undefined,
): PrintingLocation[] {
  if (!locations) return [];

  const locationMap: Record<string, PrintingLocation> = {
    "Left Sleeve": "LEFT_SLEEVE",
    "Right Sleeve": "RIGHT_SLEEVE",
    "Back Location": "BACK_LOCATION",
    "Special Location": "SPECIAL_LOCATION",
  };

  return locations
    .split(",")
    .map((loc) => locationMap[loc.trim()])
    .filter((loc): loc is PrintingLocation => Boolean(loc));
}

export default router;
