import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Download, Eye, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import type { ShopifyOrder } from "@/lib/types";

export default function Orders() {
  const [_, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
  const { toast } = useToast();

  // Lấy danh sách đơn hàng
  const { data: orders = [], isLoading } = useQuery<ShopifyOrder[]>({
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
          }))
        };

        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
        order.qrCode = qrCodeDataUrl;
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedOrder(order);
    setIsOpen(true);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Đơn hàng</h1>

        <div className="w-full sm:w-auto flex gap-2">
          <Button
            onClick={() => navigate('/shopify')}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Đồng bộ Shopify
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
              <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
              <TableHead className="whitespace-nowrap">Tiến độ</TableHead>
              <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}