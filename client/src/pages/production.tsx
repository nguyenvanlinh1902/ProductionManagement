import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/scanner/qr-scanner";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";

const STAGES = [
  { id: 'cutting', name: 'Cắt' },
  { id: 'sewing', name: 'May' },
  { id: 'packaging', name: 'Đóng gói' }
];

export default function Production() {
  const [selectedStage, setSelectedStage] = useState("");
  const { toast } = useToast();
  const [scannedOrder, setScannedOrder] = useState(null);

  const handleScan = async (orderId: string) => {
    try {
      if (!selectedStage) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn công đoạn sản xuất",
          variant: "destructive"
        });
        return;
      }

      const orderRef = doc(db, "shopify_orders", orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        toast({
          title: "Lỗi", 
          description: "Không tìm thấy đơn hàng",
          variant: "destructive"
        });
        return;
      }

      const orderData = orderDoc.data();
      setScannedOrder(orderData);

      await updateDoc(orderRef, {
        [`stages.${selectedStage}.completed`]: true,
        [`stages.${selectedStage}.completedAt`]: new Date(),
        [`stages.${selectedStage}.completedBy`]: auth.currentUser?.uid
      });

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái ${STAGES.find(s => s.id === selectedStage)?.name}`
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive"
      });
    }
  };

  // Lấy danh sách công đoạn 
  const { data: stages } = useQuery({
    queryKey: ['/api/settings/stages'],
    queryFn: async () => {
      const response = await fetch('/api/settings/stages');
      return response.json();
    }
  });

  // Lấy đơn hàng đang sản xuất
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      const orders = await response.json();
      return orders.filter(order => order.status === 'in_production');
    }
  });

  // Thống kê sản xuất theo ngày
  const { data: productionStats } = useQuery({
    queryKey: ['/api/production/stats'],
    queryFn: async () => {
      const response = await fetch('/api/production/stats');
      return response.json();
    }
  });


  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan">Quét mã QR</TabsTrigger>
          <TabsTrigger value="report">Báo cáo</TabsTrigger>
        </TabsList>

        <TabsContent value="scan">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Quét mã QR đơn hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn công đoạn" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <QRScanner onScan={handleScan} />

                  {scannedOrder && (
                    <div className="mt-4 p-4 border rounded">
                      <h3 className="font-medium">Thông tin đơn hàng #{scannedOrder.orderNumber}</h3>
                      <div className="mt-2 space-y-2 text-sm">
                        <p>Khách hàng: {scannedOrder.customer?.name}</p>
                        <div className="mt-2">
                          <p className="font-medium">Sản phẩm:</p>
                          {scannedOrder.products?.map((product: any, index: number) => (
                            <div key={index} className="ml-2">
                              - {product.name} (x{product.quantity})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Đơn hàng đang sản xuất</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {orders?.map((order: any) => (
                    <div key={order.id} className="p-4 border rounded space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">#{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">{order.customer?.name}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>

                      <div className="border-t pt-2">
                        <div className="font-medium mb-2">Chi tiết đơn hàng:</div>
                        {order.products?.map((product: any, index: number) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-500">
                                SKU: {product.sku}
                                {product.specifications && ` | ${product.specifications}`}
                              </div>
                            </div>
                            <div>SL: {product.quantity}</div>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="text-sm text-gray-600 border-t pt-2">
                          <span className="font-medium">Ghi chú:</span> {order.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo sản xuất hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completed" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}