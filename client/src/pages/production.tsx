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
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function Production() {
  const [selectedStage, setSelectedStage] = useState("cutting");
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/production'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "orders"));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const productionStages = [
    { id: "cutting", name: "Cắt" },
    { id: "assembly", name: "Lắp ráp" },
    { id: "finishing", name: "Hoàn thiện" },
    { id: "quality", name: "Kiểm tra chất lượng" }
  ];

  const handleScan = async (decodedText: string) => {
    try {
      const orderRef = doc(db, "orders", decodedText);
      await updateDoc(orderRef, {
        [`stages.${selectedStage}`]: {
          completed: true,
          completedAt: new Date().toISOString()
        }
      });

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái cho đơn hàng ${decodedText}`
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
      <h1 className="text-3xl font-bold">Theo dõi sản xuất</h1>

      <div className="grid gap-4 md:grid-cols-2">
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productionStages.map(stage => (
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

        <Card>
          <CardHeader>
            <CardTitle>Trạng thái sản xuất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders?.map((order: any) => (
                <div key={order.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Đơn hàng #{order.id}</span>
                    <span className="text-sm text-muted-foreground">
                      {order.customer}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {productionStages.map(stage => (
                      <div 
                        key={stage.id}
                        className={`text-center p-2 rounded ${
                          order.stages?.[stage.id]?.completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100'
                        }`}
                      >
                        <div className="text-xs">{stage.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}