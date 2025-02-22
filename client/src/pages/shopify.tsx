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

// Add validation for Shopify credentials
const validateShopifyCredentials = () => {
  const required = ['VITE_SHOPIFY_STORE_URL', 'VITE_SHOPIFY_ACCESS_TOKEN'];
  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(`Thiếu thông tin cấu hình Shopify: ${missing.join(', ')}`);
  }

  // Validate store URL format
  const storeUrl = import.meta.env.VITE_SHOPIFY_STORE_URL;
  if (!storeUrl.includes('.myshopify.com')) {
    throw new Error('URL cửa hàng Shopify không hợp lệ. URL phải có định dạng xxx.myshopify.com');
  }
};

// Format store URL correctly
const getShopifyApiUrl = (endpoint: string) => {
  if (!import.meta.env.VITE_SHOPIFY_STORE_URL) {
    throw new Error('VITE_SHOPIFY_STORE_URL is not defined');
  }
  const storeUrl = import.meta.env.VITE_SHOPIFY_STORE_URL.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  return `https://${storeUrl}${endpoint}`;
};

// Test Shopify API connection
const testShopifyConnection = async () => {
  try {
    console.log('Testing Shopify connection...');

    const accessToken = import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN?.trim();
    const storeUrl = import.meta.env.VITE_SHOPIFY_STORE_URL?.trim();

    if (!accessToken) {
      throw new Error('Chưa cấu hình Access Token Shopify');
    }

    if (!storeUrl) {
      throw new Error('Chưa cấu hình URL cửa hàng Shopify');
    }

    // Validate store URL format
    const urlPattern = /^[a-zA-Z0-9-]+\.myshopify\.com$/;
    if (!urlPattern.test(storeUrl)) {
      throw new Error('URL cửa hàng phải có định dạng xxx.myshopify.com (không cần https://)');
    }
    
    // Đảm bảo URL đúng định dạng
    storeUrl = storeUrl
      .replace(/^https?:\/\//i, '')  // Xóa protocol nếu có
      .replace(/\/$/, '')            // Xóa dấu / cuối nếu có
      .trim();                       // Xóa khoảng trắng
    
    const cleanStoreUrl = storeUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    const apiUrl = `https://${cleanStoreUrl}/admin/api/${SHOPIFY_API_VERSION}/shop.json`;
    console.log('Testing connection to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      console.error('Fetch error:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        throw new Error('Không thể kết nối tới Shopify. Vui lòng kiểm tra URL cửa hàng và kết nối mạng.');
      }
      throw new Error(`Lỗi kết nối: ${err.message}`);
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Không thể kết nối với Shopify: ${errorData.errors || response.statusText}`);
    }

    const data = await response.json();
    console.log('Connection test successful:', data.shop?.name);
    return true;
  } catch (error: any) {
    console.error('Connection test failed:', error);
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Không thể kết nối tới Shopify. Vui lòng kiểm tra URL cửa hàng và kết nối mạng.');
    }
    throw error;
  }
};

export default function Shopify() {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Lấy danh sách đơn hàng chưa import
  const { data: pendingOrders = [], isLoading, refetch } = useQuery<ShopifyOrder[]>({
    queryKey: ['/api/orders/pending-import'],
    queryFn: async () => {
      const ordersRef = collection(db, "shopify_orders");
      const q = query(
        ordersRef,
        where("imported", "==", false),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShopifyOrder[];
    }
  });

  // Đồng bộ đơn hàng từ Shopify
  const syncFromShopify = useMutation({
    mutationFn: async () => {
      try {
        // Validate credentials
        validateShopifyCredentials();

        // Test connection first
        await testShopifyConnection();

        // Fetch orders
        const apiUrl = getShopifyApiUrl(`/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any`);
        console.log('Fetching orders from:', apiUrl);

        const response = await fetch(apiUrl, {
          headers: {
            'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Shopify API error:', {
            status: response.status,
            statusText: response.statusText,
            errors: errorData
          });
          throw new Error(
            `Lỗi API Shopify (${response.status}): ${
              errorData.errors ? JSON.stringify(errorData.errors) : response.statusText
            }`
          );
        }

        const data = await response.json();

        if (!data.orders) {
          console.error('Invalid Shopify response:', data);
          throw new Error('Dữ liệu trả về từ Shopify không hợp lệ');
        }

        console.log('Received orders from Shopify:', data.orders.length);

        // Save orders to Firebase
        let importedCount = 0;
        for (const shopifyOrder of data.orders) {
          const orderData = {
            orderNumber: shopifyOrder.name,
            imported: false,
            customer: {
              name: shopifyOrder.customer?.first_name + ' ' + shopifyOrder.customer?.last_name,
              email: shopifyOrder.email,
              phone: shopifyOrder.phone,
              address: shopifyOrder.billing_address?.address1
            },
            products: shopifyOrder.line_items.map((item: any) => ({
              name: item.title,
              quantity: item.quantity,
              price: parseFloat(item.price),
              sku: item.sku,
              color: item.properties?.find((p: any) => p.name === "Color")?.value || '',
              size: item.properties?.find((p: any) => p.name === "Size")?.value || '',
              embroideryPositions: item.properties?.find((p: any) => p.name === "Embroidery Positions")?.value?.split(',').map((pos: string) => ({
                name: pos.trim(),
                description: ''
              })) || []
            })),
            createdAt: new Date(shopifyOrder.created_at).toISOString(),
            total: parseFloat(shopifyOrder.total_price)
          };

          // Check if order already exists
          const existingOrdersQuery = query(
            collection(db, "shopify_orders"),
            where("orderNumber", "==", orderData.orderNumber)
          );
          const existingOrders = await getDocs(existingOrdersQuery);

          if (existingOrders.empty) {
            await addDoc(collection(db, "shopify_orders"), orderData);
            importedCount++;
          }
        }

        console.log(`Successfully imported ${importedCount} new orders`);
        return importedCount;
      } catch (error: any) {
        console.error('Shopify sync error:', error);
        throw error;
      }
    },
    onSuccess: (importedCount) => {
      toast({
        title: "Thành công",
        description: `Đã đồng bộ ${importedCount} đơn hàng mới từ Shopify`
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi đồng bộ",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Import đơn hàng lên Shopify
  const importToShopify = useMutation({
    mutationFn: async (orders: ShopifyOrder[]) => {
      try {
        // Test connection first
        await testShopifyConnection();

        // Create orders one by one to handle potential errors
        for (const order of orders) {
          const orderData = {
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
          };

          console.log('Creating Shopify order:', orderData);

          const response = await fetch(
            getShopifyApiUrl(`/admin/api/${SHOPIFY_API_VERSION}/orders.json`),
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
            console.error('Shopify order creation error:', errorData);
            throw new Error(`Lỗi tạo đơn hàng trên Shopify: ${JSON.stringify(errorData.errors)}`);
          }

          // Update imported status in Firebase
          const orderRef = doc(db, "shopify_orders", order.id);
          await updateDoc(orderRef, {
            imported: true,
            importedAt: new Date().toISOString()
          });
        }

        return true;
      } catch (error: any) {
        console.error('Shopify import error:', error);
        throw new Error(error.message || 'Lỗi khi import lên Shopify');
      }
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã import đơn hàng lên Shopify"
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

  const handleImportToShopify = () => {
    if (pendingOrders.length > 0) {
      importToShopify.mutate(pendingOrders);
    } else {
      toast({
        title: "Thông báo",
        description: "Không có đơn hàng cần import"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target?.result as string;
        const results = Papa.parse(csvData, { header: true });
        const orders = [];

        for (const row of results.data as any[]) {
          if (!row.Name || !row.Email) continue;

          const orderData = {
            orderNumber: row.Name,
            imported: false,
            customer: {
              name: row['Billing Name'] || '',
              email: row.Email || '',
              phone: row.Phone || '',
              address: row['Billing Address1'] || ''
            },
            products: [{
              name: row['Lineitem name'] || '',
              quantity: parseInt(row['Lineitem quantity']) || 1,
              price: parseFloat(row['Lineitem price']) || 0,
              sku: row['Lineitem sku'] || '',
              color: row['Lineitem properties Color'] || '',
              size: row['Lineitem properties Size'] || '',
              embroideryPositions: row.Notes ?
                row.Notes.split(',').map((pos: string) => ({
                  name: pos.trim(),
                  description: '',
                })) : []
            }],
            createdAt: new Date().toISOString(),
            total: parseFloat(row.Total) || 0,
          };

          const existingOrdersQuery = query(
            collection(db, "shopify_orders"),
            where("orderNumber", "==", orderData.orderNumber)
          );
          const existingOrders = await getDocs(existingOrdersQuery);

          if (existingOrders.empty) {
            await addDoc(collection(db, "shopify_orders"), orderData);
            orders.push(orderData);
          }
        }

        toast({
          title: "Thành công",
          description: `Đã import ${orders.length} đơn hàng từ file CSV`
        });
        refetch();
      } catch (error: any) {
        console.error('CSV import error:', error);
        toast({
          title: "Lỗi",
          description: error.message || 'Lỗi khi import file CSV',
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Lỗi! </strong>
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <span className="sr-only">Đóng</span>
            <span className="text-2xl">&times;</span>
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Đồng bộ Shopify</h1>

        <div className="w-full sm:w-auto flex gap-2">
          <Button
            onClick={() => syncFromShopify.mutate()}
            variant="outline"
            className="w-full sm:w-auto"
            disabled={syncFromShopify.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncFromShopify.isPending ? 'animate-spin' : ''}`} />
            Đồng bộ từ Shopify
          </Button>
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
            onClick={handleImportToShopify}
            className="w-full sm:w-auto"
            disabled={pendingOrders.length === 0 || importToShopify.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import lên Shopify ({pendingOrders.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng chờ import</CardTitle>
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
                    Không có đơn hàng nào chờ import
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