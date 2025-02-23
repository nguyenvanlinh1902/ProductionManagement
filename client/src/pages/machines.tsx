import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Play, Pause, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import type { SewingMachine, MachineRecommendation } from "@/lib/types";

export default function Machines() {
  const [selectedMachine, setSelectedMachine] = useState<SewingMachine | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch machines list
  const { data: machines = [], isLoading, refetch } = useQuery<SewingMachine[]>({
    queryKey: ['/api/machines'],
    queryFn: async () => {
      try {
        const machinesRef = collection(db, "sewing_machines");
        const q = query(machinesRef, orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SewingMachine[];
      } catch (error) {
        console.error('Error fetching machines:', error);
        throw new Error('Failed to fetch machines');
      }
    }
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery<MachineRecommendation[]>({
    queryKey: ['/api/machines/recommendations'],
    queryFn: async () => {
      try {
        const recsRef = collection(db, "machine_recommendations");
        const snapshot = await getDocs(recsRef);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MachineRecommendation[];
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        return [];
      }
    }
  });

  // Update machine status
  const updateMachine = useMutation({
    mutationFn: async (data: Partial<SewingMachine>) => {
      if (!selectedMachine) return;
      
      const machineRef = doc(db, "sewing_machines", selectedMachine.id);
      await updateDoc(machineRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái máy"
      });
      setIsUpdateDialogOpen(false);
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

  // Get recommendations for a machine
  const getRecommendationsForMachine = (machineId: string) => {
    return recommendations.filter(rec => rec.machineId === machineId)
      .sort((a, b) => b.priority - a.priority);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quản lý máy khâu</h1>
        <Button onClick={() => setIsUpdateDialogOpen(true)}>
          Thêm máy mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách máy</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máy</TableHead>
                <TableHead>Người quản lý</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Màu chỉ hiện tại</TableHead>
                <TableHead>Sản phẩm đang làm</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Đề xuất tiếp theo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => {
                const recommendations = getRecommendationsForMachine(machine.id);
                const nextRec = recommendations[0];
                
                return (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium">{machine.name}</TableCell>
                    <TableCell>{machine.managerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {machine.status === 'working' ? (
                          <Play className="w-4 h-4 text-green-500" />
                        ) : machine.status === 'idle' ? (
                          <Pause className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        <span>
                          {machine.status === 'working' ? 'Đang hoạt động' :
                           machine.status === 'idle' ? 'Đang rảnh' : 'Bảo trì'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {machine.currentThreadColor && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: machine.currentThreadColor }}
                          />
                          {machine.currentThreadColor}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {machine.currentProductName || 'Không có'}
                    </TableCell>
                    <TableCell>
                      {machine.status === 'working' && machine.startTime && (
                        <div className="text-sm">
                          <div>Bắt đầu: {new Date(machine.startTime).toLocaleTimeString()}</div>
                          {machine.estimatedEndTime && (
                            <div>Dự kiến xong: {new Date(machine.estimatedEndTime).toLocaleTimeString()}</div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {nextRec && (
                        <div className="text-sm">
                          <div className="font-medium">{nextRec.reason}</div>
                          <div className="text-muted-foreground">
                            Thời gian ước tính: {nextRec.estimatedTime} phút
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedMachine(machine);
                          setIsUpdateDialogOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedMachine ? 'Cập nhật trạng thái máy' : 'Thêm máy mới'}
            </DialogTitle>
          </DialogHeader>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMachine.mutate({
                status: formData.get('status') as SewingMachine['status'],
                currentThreadColor: formData.get('threadColor') as string,
                currentProductId: formData.get('productId') as string,
                currentProductName: formData.get('productName') as string,
                startTime: formData.get('startTime') as string,
                estimatedEndTime: formData.get('estimatedEndTime') as string,
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label>Trạng thái</Label>
              <select
                name="status"
                className="w-full"
                defaultValue={selectedMachine?.status}
              >
                <option value="idle">Đang rảnh</option>
                <option value="working">Đang hoạt động</option>
                <option value="maintenance">Đang bảo trì</option>
              </select>
            </div>

            <div>
              <Label>Màu chỉ hiện tại</Label>
              <Input
                name="threadColor"
                defaultValue={selectedMachine?.currentThreadColor}
              />
            </div>

            <div>
              <Label>Sản phẩm đang làm</Label>
              <Input
                name="productName"
                defaultValue={selectedMachine?.currentProductName}
              />
            </div>

            <div>
              <Label>Thời gian bắt đầu</Label>
              <Input
                type="datetime-local"
                name="startTime"
                defaultValue={selectedMachine?.startTime}
              />
            </div>

            <div>
              <Label>Thời gian dự kiến hoàn thành</Label>
              <Input
                type="datetime-local"
                name="estimatedEndTime"
                defaultValue={selectedMachine?.estimatedEndTime}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUpdateDialogOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit">
                {selectedMachine ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
