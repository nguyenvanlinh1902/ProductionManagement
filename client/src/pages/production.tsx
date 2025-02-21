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
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where, getDoc, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { auth } from "@/lib/firebase"; // Assuming auth is imported elsewhere

export default function Production() {
  const [selectedStage, setSelectedStage] = useState("");
  const { toast } = useToast();

  // Lấy danh sách công đoạn từ settings
  const { data: stages } = useQuery({
    queryKey: ['/api/settings/stages'],
    queryFn: async () => {
      const doc = await getDoc(doc(db, "settings", "productionStages"));
      if (doc.exists()) {
        return doc.data().stages;
      }
      return [];
    }
  });

  // Lấy đơn hàng đang sản xuất
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/production/orders'],
    queryFn: async () => {
      const q = query(
        collection(db, "orders"),
        where("status", "==", "in_production")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  // Thống kê sản xuất theo ngày
  const { data: productionStats } = useQuery({
    queryKey: ['/api/production/stats'],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0,0,0,0));

      const q = query(
        collection(db, "productionLogs"),
        where("completedAt", ">=", startOfDay)
      );

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data());

      // Group by stage and count
      const stats = stages?.map(stage => ({
        name: stage.name,
        completed: logs.filter(log => log.stage === stage.id).length
      })) || [];

      return stats;
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

      const orderRef = doc(db, "orders", decodedText);
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

      // Log production progress
      await addDoc(collection(db, "productionLogs"), {
        orderId: decodedText,
        stage: selectedStage,
        completedAt: new Date(),
        completedBy: auth.currentUser?.uid
      });

      // Update order status
      await updateDoc(orderRef, {
        [`stages.${selectedStage}`]: {
          completed: true,
          completedAt: new Date().toISOString()
        }
      });

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái cho đơn hàng ${orderData.orderNumber}`
      });
    } catch (error) {
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Sản xuất</h1>

      <Tabs defaultValue="monitor">
        <TabsList>
          <TabsTrigger value="scan">Quét QR</TabsTrigger>
          <TabsTrigger value="monitor">Theo dõi sản xuất</TabsTrigger>
          <TabsTrigger value="report">Báo cáo</TabsTrigger>
        </TabsList>

        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <CardTitle>Quét mã QR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Chọn công đoạn sản xuất
                </label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn công đoạn" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages?.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <QRScanner onScan={handleScan} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái sản xuất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders?.map((order: any) => (
                  <div key={order.id} className="border p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">
                        Đơn hàng #{order.orderNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {order.customer?.name || 'Không có tên'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {stages?.map(stage => {
                        const stageData = order.stages?.[stage.id];
                        return (
                          <div 
                            key={stage.id}
                            className={`text-center p-2 rounded ${
                              stageData?.completed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100'
                            }`}
                            title={stageData?.completed 
                              ? `Hoàn thành: ${new Date(stageData.completedAt).toLocaleString()}`
                              : 'Chưa hoàn thành'
                            }
                          >
                            <div className="text-xs">{stage.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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