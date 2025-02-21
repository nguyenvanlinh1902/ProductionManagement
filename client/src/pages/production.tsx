import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Production() {
  // Lấy đơn hàng đang sản xuất
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders/in-production'],
    queryFn: async () => {
      const ordersRef = collection(db, "shopify_orders");
      const q = query(
        ordersRef,
        where("status", "==", "in_production"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  // Lấy thống kê sản xuất theo ngày
  const { data: productionStats = [] } = useQuery({
    queryKey: ['/api/production/stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const logsRef = collection(db, "productionLogs");
      const q = query(
        logsRef,
        where("completedAt", ">=", today.toISOString())
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data());

      // Tổng hợp theo công đoạn
      const stats = {};
      logs.forEach(log => {
        if (!stats[log.stage]) {
          stats[log.stage] = 0;
        }
        stats[log.stage]++;
      });

      return Object.entries(stats).map(([stage, count]) => ({
        name: stage === 'cutting' ? 'Cắt' :
              stage === 'sewing' ? 'May' :
              stage === 'embroidery' ? 'Thêu' :
              stage === 'finishing' ? 'Hoàn thiện' :
              stage === 'quality' ? 'Kiểm tra' :
              stage === 'packaging' ? 'Đóng gói' : stage,
        completed: count
      }));
    }
  });

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Đơn hàng đang sản xuất</TabsTrigger>
          <TabsTrigger value="report">Báo cáo sản xuất</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Đơn hàng đang sản xuất</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Công đoạn hiện tại</TableHead>
                    <TableHead>Tiến độ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => {
                    // Tìm công đoạn hiện tại
                    const currentStage = order.stages.find(s => s.status === 'in_progress') ||
                                      order.stages.find(s => s.status === 'pending');

                    // Tính % hoàn thành
                    const completedStages = order.stages.filter(s => s.status === 'completed').length;
                    const progress = Math.round((completedStages / order.stages.length) * 100);

                    return (
                      <TableRow key={order.id}>
                        <TableCell>{order.orderNumber}</TableCell>
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
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              currentStage?.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                            }`} />
                            <span>{currentStage?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">
                            {progress}% hoàn thành
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo sản xuất hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
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