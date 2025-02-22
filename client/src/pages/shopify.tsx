import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, RefreshCw } from "lucide-react";
import Papa from 'papaparse';
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import type { ShopifyOrder } from "@/lib/types";

const SHOPIFY_API_VERSION = '2024-01';

export default function Shopify() {
  const { toast } = useToast();

  // Lấy danh sách đơn hàng chưa đồng bộ
  const { data: pendingOrders = [], isLoading, refetch } = useQuery<ShopifyOrder[]>({
    queryKey: ['/api/orders/pending-sync'],
    queryFn: async () => {
      const ordersRef = collection(db, "shopify_orders");
      const q = query(
        ordersRef,
        where("synced", "==", false),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShopifyOrder[];
    }
  });

  // Import đơn hàng từ CSV
  const importOrders = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            try {
              for (const row of results.data as any[]) {
                if (!row.Name || !row.Email) continue;

                const embroideryPositions = row.Notes ? 
                  row.Notes.split(',').map((pos: string) => ({
                    name: pos.trim(),
                    description: '',
                  })) : [];

                const product = {
                  name: row['Lineitem name'] || '',
                  quantity: parseInt(row['Lineitem quantity']) || 1,
                  price: parseFloat(row['Lineitem price']) || 0,
                  sku: row['Lineitem sku'] || '',
                  color: row['Lineitem properties Color'] || '',
                  size: row['Lineitem properties Size'] || '',
                  embroideryPositions
                };

                await addDoc(collection(db, "shopify_orders"), {
                  orderNumber: row.Name,
                  synced: false,
                  customer: {
                    name: row['Billing Name'] || '',
                    email: row.Email || '',
                    phone: row.Phone || '',
                    address: row['Billing Address1'] || ''
                  },
                  products: [product],
                  createdAt: new Date().toISOString(),
                  total: parseFloat(row.Total) || 0,
                });
              }
              resolve(true);
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => reject(error)
        });
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã import đơn hàng"
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Đồng bộ đơn hàng lên Shopify
  const syncToShopify = useMutation({
    mutationFn: async (orders: ShopifyOrder[]) => {
      const shopifyOrders = orders.map(order => ({
        order: {
          email: order.customer.email,
          phone: order.customer.phone,
          billing_address: {
            first_name: order.customer.name,
            address1: order.customer.address,
          },
          line_items: order.products.map(product => ({
            title: product.name,
            quantity: product.quantity,
            price: product.price.toString(),
            sku: product.sku,
            properties: [
              { name: "Color", value: product.color },
              { name: "Size", value: product.size },
              { name: "Embroidery Positions", value: product.embroideryPositions?.map(p => p.name).join(', ') }
            ]
          }))
        }
      }));

      try {
        // Create orders one by one to handle potential errors
        for (const orderData of shopifyOrders) {
          const response = await fetch(
            `https://${import.meta.env.VITE_SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/orders.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN
              },
              body: JSON.stringify(orderData)
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Lỗi Shopify API: ${JSON.stringify(errorData.errors)}`);
          }

          const data = await response.json();
          console.log('Shopify order created:', data);
        }

        // Update synced status in Firebase
        for (const order of orders) {
          const orderRef = doc(db, "shopify_orders", order.id);
          await updateDoc(orderRef, {
            synced: true,
            syncedAt: new Date().toISOString()
          });
        }

        return true;
      } catch (error: any) {
        console.error('Shopify sync error:', error);
        throw new Error(error.message || 'Lỗi khi đồng bộ với Shopify');
      }
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã đồng bộ đơn hàng lên Shopify"
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importOrders.mutate(file);
    }
  };

  const handleSyncToShopify = () => {
    if (pendingOrders.length > 0) {
      syncToShopify.mutate(pendingOrders);
    } else {
      toast({
        title: "Thông báo",
        description: "Không có đơn hàng cần đồng bộ"
      });
    }
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Đồng bộ Shopify</h1>

        <div className="w-full sm:w-auto flex gap-2">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </span>
            </Button>
          </label>
          <Button 
            onClick={handleSyncToShopify}
            className="w-full sm:w-auto"
            disabled={pendingOrders.length === 0 || syncToShopify.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncToShopify.isPending ? 'animate-spin' : ''}`} />
            Đồng bộ ({pendingOrders.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng chờ đồng bộ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Tổng tiền</TableHead>
                <TableHead>Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    <div className="min-w-[180px]">
                      <div className="font-medium truncate">{order.customer?.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {order.customer?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-[200px]">
                      {order.products?.map((product, index) => (
                        <div key={index} className="text-sm">
                          <div className="truncate">
                            {product.name} ({product.size || 'N/A'}) x {product.quantity}
                          </div>
                          {product.embroideryPositions && product.embroideryPositions.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              Vị trí thêu: {product.embroideryPositions.map(p => p.name).join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{order.total.toLocaleString('vi-VN')} đ</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </TableCell>
                </TableRow>
              ))}
              {pendingOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không có đơn hàng nào chờ đồng bộ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}