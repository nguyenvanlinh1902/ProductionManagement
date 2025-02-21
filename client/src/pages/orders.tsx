import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, PlusCircle, Download, Eye } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { useForm } from "react-hook-form";
import Papa from 'papaparse';
import QRCode from "qrcode";

interface EmbroideryPosition {
  name: string;
  description: string;
  designFile?: string;
}

interface Product {
  name: string;
  quantity: number;
  price: number;
  sku: string;
  color: string;
  size: string;
  embroideryPositions: EmbroideryPosition[];
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface ProductionStage {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

interface ShopifyOrder {
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
}

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

  // Import đơn hàng từ CSV
  const importOrders = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            try {
              for (const row of results.data) {
                // Xử lý thông tin vị trí thêu từ notes
                const embroideryPositions: EmbroideryPosition[] = [];
                if (row.Notes) {
                  // Parse thông tin vị trí thêu từ note
                  const positions = row.Notes.split(',').map(pos => ({
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
                  {
                    id: 'cutting',
                    name: 'Cắt',
                    status: 'pending'
                  },
                  {
                    id: 'sewing',
                    name: 'May',
                    status: 'pending'
                  },
                  {
                    id: 'embroidery',
                    name: 'Thêu',
                    status: 'pending'
                  },
                  {
                    id: 'finishing',
                    name: 'Hoàn thiện',
                    status: 'pending'
                  },
                  {
                    id: 'quality',
                    name: 'Kiểm tra chất lượng',
                    status: 'pending'
                  },
                  {
                    id: 'packaging',
                    name: 'Đóng gói',
                    status: 'pending'
                  }
                ];

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
                  qrCode: null
                });
              }
              resolve(true);
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã import đơn hàng từ Shopify"
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể import đơn hàng",
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

  const handleOrderSelect = async (order: ShopifyOrder) => {
    if (!order.qrCode) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          products: order.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            embroideryPositions: p.embroideryPositions
          }))
        }));

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Đơn hàng</h1>

        <div className="flex gap-2">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </span>
            </Button>
          </label>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn hàng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tiến độ</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Hạn giao</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customer?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer?.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {order.products?.map((product, index) => (
                    <div key={index} className="text-sm">
                      <div>
                        {product.name} ({product.size}) x {product.quantity}
                      </div>
                      {product.embroideryPositions.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Vị trí thêu: {product.embroideryPositions.map(p => p.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
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
                  <div className="space-y-1">
                    {order.stages.map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          stage.status === 'completed' ? 'bg-green-500' :
                          stage.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-xs">{stage.name}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                <TableCell>
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
                        Màu: {product.color}, Size: {product.size}
                      </div>
                      <div className="text-sm">Số lượng: {product.quantity}</div>
                      {product.embroideryPositions.length > 0 && (
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
                  <h3 className="font-semibold mb-2">Mã QR</h3>
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