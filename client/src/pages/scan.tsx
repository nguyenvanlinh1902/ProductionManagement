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
import { collection, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export default function Scan() {
  const [selectedStage, setSelectedStage] = useState("");
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quét QR</h1>

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
                {stages?.map((stage: any) => (
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
    </div>
  );
}
