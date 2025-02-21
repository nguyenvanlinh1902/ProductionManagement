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
  const { toast } = useToast();

  // Lấy thông tin người dùng và công đoạn được phân quyền
  const { data: userStages } = useQuery({
    queryKey: ['/api/user/stages', auth.currentUser?.uid],
    queryFn: async () => {
      if (!auth.currentUser?.uid) return [];
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data().assignedStages || [];
      }
      return [];
    }
  });

  // Lấy danh sách tất cả công đoạn
  const { data: allStages } = useQuery({
    queryKey: ['/api/settings/stages'],
    queryFn: async () => {
      const stagesDoc = await getDoc(doc(db, "settings", "productionStages"));
      if (stagesDoc.exists()) {
        return stagesDoc.data().stages;
      }
      return [];
    }
  });

  // Lọc ra các công đoạn được phân quyền
  const availableStages = allStages?.filter(stage => 
    userStages?.includes(stage.id)
  ) || [];

  const handleScan = async (decodedText: string) => {
    try {
      // Kiểm tra quyền truy cập công đoạn
      if (!userStages?.length) {
        toast({
          title: "Lỗi",
          description: "Bạn chưa được phân công đoạn sản xuất nào",
          variant: "destructive"
        });
        return;
      }

      const orderRef = doc(db, "shopify_orders", decodedText);
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

      // Tự động cập nhật tất cả công đoạn được phân quyền
      for (const stageId of userStages) {
        // Log production progress
        await addDoc(collection(db, "productionLogs"), {
          orderId: decodedText,
          stage: stageId,
          completedAt: new Date(),
          completedBy: auth.currentUser?.uid
        });

        // Update order status
        await updateDoc(orderRef, {
          [`stages.${stageId}`]: {
            completed: true,
            completedAt: new Date().toISOString(),
            completedBy: auth.currentUser?.uid
          }
        });
      }

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái cho đơn hàng ${orderData.Name}`
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
    <div className="container max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Quét QR</h1>

      <Card>
        <CardHeader>
          <CardTitle>Quét mã QR đơn hàng</CardTitle>
        </CardHeader>
        <CardContent>
          {availableStages.length > 0 ? (
            <div className="space-y-6">
              <div className="text-sm">
                Bạn được phân công các công đoạn:
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableStages.map(stage => (
                    <span
                      key={stage.id}
                      className="px-2 py-1 bg-primary/10 rounded-full text-xs"
                    >
                      {stage.name}
                    </span>
                  ))}
                </div>
              </div>
              <QRScanner onScan={handleScan} />
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Bạn chưa được phân công đoạn sản xuất nào
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}