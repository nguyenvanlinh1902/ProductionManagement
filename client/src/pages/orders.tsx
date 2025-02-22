import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Eye, Upload } from "lucide-react";
import Papa from 'papaparse';
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import type { 
  ShopifyOrder, 
  EmbroideryPosition, 
  Product, 
  ProductionStage 
} from "@/lib/types";

export default function Orders() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
  const { toast } = useToast();

  // Lấy danh sách đơn hàng
  const { data: orders = [], isLoading, refetch } = useQuery<ShopifyOrder[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const ordersRef = collection(db, "shopify_orders");
      const q = query(ordersRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShopifyOrder[];
    }
  });

  // Xác định độ phức tạp của đơn hàng
  const determineOrderComplexity = (products: Product[]) => {
    let hasMultipleProducts = products.length > 1;
    let hasMultiplePositions = products.some(p => 
      p.embroideryPositions && p.embroideryPositions.length > 1
    );

    if (hasMultipleProducts && hasMultiplePositions) {
      return 'very_complex';
    } else if (hasMultiplePositions) {
      return 'complex';
    } else if (hasMultipleProducts) {
      return 'medium';
    }
    return 'simple';
  };

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

                // Xử lý thông tin vị trí thêu từ notes
                const embroideryPositions: EmbroideryPosition[] = [];
                if (row.Notes) {
                  const positions = row.Notes.split(',').map((pos: string) => ({
                    name: pos.trim(),
                    description: '',
                  }));
                  embroideryPositions.push(...positions);
                }

                // Tạo sản phẩm với thông tin chi tiết
                const product: Product = {
                  name: row['Lineitem name'] || '',
                  quantity: parseInt(row['Lineitem quantity']) || 1,
                  price: parseFloat(row['Lineitem price']) || 0,
                  sku: row['Lineitem sku'] || '',
                  color: row['Lineitem properties Color'] || '',
                  size: row['Lineitem properties Size'] || '',
                  embroideryPositions
                };

                // Tạo các công đoạn sản xuất mặc định
                const stages: ProductionStage[] = [
                  { id: 'cutting', name: 'Cắt', status: 'pending' },
                  { id: 'sewing', name: 'May', status: 'pending' },
                  { id: 'embroidery', name: 'Thêu', status: 'pending' },
                  { id: 'finishing', name: 'Hoàn thiện', status: 'pending' },
                  { id: 'quality', name: 'Kiểm tra chất lượng', status: 'pending' },
                  { id: 'packaging', name: 'Đóng gói', status: 'pending' }
                ];

                // Xác định độ phức tạp
                const complexity = determineOrderComplexity([product]);

                // Tạo đơn hàng mới
                await addDoc(collection(db, "shopify_orders"), {
                  orderNumber: row.Name,
                  customer: {
                    name: row['Billing Name'] || '',
                    email: row.Email || '',
                    phone: row.Phone || '',
                    address: row['Billing Address1'] || ''
                  },
                  products: [product],
                  stages,
                  status: 'pending',
                  notes: row.Notes || '',
                  createdAt: new Date().toISOString(),
                  deadline: row['Paid at'] || null,
                  total: parseFloat(row.Total) || 0,
                  qrCode: null,
                  complexity
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

  // Import đơn hàng lên Shopify
  const exportToShopify = useMutation({
    mutationFn: async (orders: ShopifyOrder[]) => {
      const shopifyOrdersData = orders.map(order => ({
        email: order.customer.email,
        phone: order.customer.phone,
        billing_address: {
          first_name: order.customer.name,
          address1: order.customer.address,
        },
        line_items: order.products.map(product => ({
          title: product.name,
          quantity: product.quantity,
          price: product.price,
          sku: product.sku,
          properties: {
            Color: product.color,
            Size: product.size,
            'Embroidery Positions': product.embroideryPositions?.map(p => p.name).join(', ')
          }
        }))
      }));

      // Gửi dữ liệu lên Shopify API
      try {
        const response = await fetch(`https://${import.meta.env.VITE_SHOPIFY_STORE_URL}/admin/api/2024-01/orders.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN
          },
          body: JSON.stringify({ orders: shopifyOrdersData })
        });

        if (!response.ok) {
          throw new Error('Failed to export orders to Shopify');
        }

        return await response.json();
      } catch (error: any) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã xuất đơn hàng lên Shopify"
      });
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

  const handleExportToShopify = () => {
    if (orders.length > 0) {
      exportToShopify.mutate(orders);
    } else {
      toast({
        title: "Lỗi",
        description: "Không có đơn hàng để xuất",
        variant: "destructive"
      });
    }
  };

  const handleOrderSelect = async (order: ShopifyOrder) => {
    if (!order.qrCode) {
      try {
        // Tạo QR code với thông tin chi tiết
        const qrData = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          products: order.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            color: p.color,
            size: p.size,
            embroideryPositions: p.embroideryPositions || []
          })),
          complexity: order.complexity
        };

        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
        order.qrCode = qrCodeDataUrl;
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedOrder(order);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Đơn hàng</h1>

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
            onClick={handleExportToShopify}
            className="w-full sm:w-auto"
            disabled={orders.length === 0 || exportToShopify.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            Xuất lên Shopify
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Mã đơn</TableHead>
              <TableHead className="whitespace-nowrap">Khách hàng</TableHead>
              <TableHead className="whitespace-nowrap">Sản phẩm</TableHead>
              <TableHead className="whitespace-nowrap">Độ phức tạp</TableHead>
              <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
              <TableHead className="whitespace-nowrap">Tiến độ</TableHead>
              <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
              <TableHead className="whitespace-nowrap">Hạn giao</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
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
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.complexity === 'very_complex' ? 'bg-red-100 text-red-800' :
                    order.complexity === 'complex' ? 'bg-orange-100 text-orange-800' :
                    order.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {order.complexity === 'very_complex' ? 'Rất phức tạp' :
                     order.complexity === 'complex' ? 'Phức tạp' :
                     order.complexity === 'medium' ? 'Trung bình' :
                     'Đơn giản'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'in_production' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'completed' ? 'Hoàn thành' :
                     order.status === 'in_production' ? 'Đang sản xuất' :
                     'Chờ xử lý'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="min-w-[150px] space-y-1">
                    {order?.stages?.map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          stage.status === 'completed' ? 'bg-green-500' :
                          stage.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-xs whitespace-nowrap">{stage.name}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.deadline ? new Date(order.deadline).toLocaleDateString('vi-VN') : '-'}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => handleOrderSelect(order)} 
                      variant="ghost" 
                      size="icon"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {order.qrCode && (
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = order.qrCode!;
                          link.download = `order-${order.orderNumber}-qr.png`;
                          link.click();
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
                  <div className="space-y-1 text-sm">
                    <p>Tên: {selectedOrder.customer?.name}</p>
                    <p>Email: {selectedOrder.customer?.email}</p>
                    <p>SĐT: {selectedOrder.customer?.phone}</p>
                    <p>Địa chỉ: {selectedOrder.customer?.address}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Sản phẩm</h3>
                  {selectedOrder.products?.map((product, index) => (
                    <div key={index} className="border-t pt-2 first:border-t-0">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Màu: {product.color || 'N/A'}, Size: {product.size || 'N/A'}
                      </div>
                      <div className="text-sm">Số lượng: {product.quantity}</div>
                      {product.embroideryPositions && product.embroideryPositions.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-medium">Vị trí thêu:</div>
                          <ul className="list-disc list-inside text-sm">
                            {product.embroideryPositions.map((pos, idx) => (
                              <li key={idx}>{pos.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">
                    Mã QR 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      selectedOrder.complexity === 'very_complex' ? 'bg-red-100 text-red-800' :
                      selectedOrder.complexity === 'complex' ? 'bg-orange-100 text-orange-800' :
                      selectedOrder.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedOrder.complexity === 'very_complex' ? 'Rất phức tạp' :
                       selectedOrder.complexity === 'complex' ? 'Phức tạp' :
                       selectedOrder.complexity === 'medium' ? 'Trung bình' :
                       'Đơn giản'}
                    </span>
                  </h3>
                  {selectedOrder.qrCode && (
                    <div className="bg-white p-4 rounded-lg">
                      <img 
                        src={selectedOrder.qrCode} 
                        alt="QR Code"
                        className="w-40 h-40 mx-auto"
                      />
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedOrder.qrCode!;
                          link.download = `order-${selectedOrder.orderNumber}-qr.png`;
                          link.click();
                        }}
                        variant="outline"
                        className="w-full mt-4"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Tải mã QR
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Tiến độ sản xuất</h3>
                  <div className="space-y-2">
                    {selectedOrder.stages.map(stage => (
                      <div key={stage.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            stage.status === 'completed' ? 'bg-green-500' :
                            stage.status === 'in_progress' ? 'bg-blue-500' :
                            'bg-gray-300'
                          }`} />
                          <span>{stage.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stage.completedAt ? new Date(stage.completedAt).toLocaleDateString('vi-VN') : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Ghi chú</h3>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}