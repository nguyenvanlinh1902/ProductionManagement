import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/scanner/qr-scanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Production() {
  const [selectedStage, setSelectedStage] = useState("");
  const { toast } = useToast();

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

  const handleScan = async (decodedText: string) => {
    try {
      if (!selectedStage) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn công đoạn sản xuất",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch(`/api/orders/${decodedText}/stages/${selectedStage}/complete`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to update production stage');
      }

      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái sản xuất",
      });

    } catch (error) {
      console.error('Error updating production stage:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái sản xuất",
        variant: "destructive"
      });
    }
  };

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
                      {stages?.map((stage: any) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <QRScanner onScan={handleScan} />
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