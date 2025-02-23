import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Pause, CheckCircle2, Timer, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import type { 
  SewingMachine, 
  MachineGroup,
  MachineOperation,
  MachineRecommendation 
} from "@/lib/types";
import { THREAD_COLORS } from "@/lib/constants";

export default function MachineGroupView() {
  const { toast } = useToast();
  const [selectedMachine, setSelectedMachine] = useState<SewingMachine | null>(null);
  const [completionDialog, setCompletionDialog] = useState(false);

  // Fetch machine group for current user
  const { data: machineGroup } = useQuery<MachineGroup>({
    queryKey: ['/api/machine-groups/my'],
    queryFn: async () => {
      // TODO: Get current user ID
      const userId = "current-user-id";
      
      const groupsRef = collection(db, "machine_groups");
      const q = query(groupsRef, where("managerId", "==", userId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        throw new Error("Không tìm thấy nhóm máy được phân công");
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as MachineGroup;
    }
  });

  // Fetch machines in group
  const { data: machines = [], refetch: refetchMachines } = useQuery<SewingMachine[]>({
    queryKey: ['/api/machines', machineGroup?.id],
    enabled: !!machineGroup,
    queryFn: async () => {
      if (!machineGroup) return [];

      const machinesRef = collection(db, "sewing_machines");
      const snapshot = await getDocs(
        query(machinesRef, where("id", "in", machineGroup.machineIds))
      );

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SewingMachine[];
    }
  });

  // Fetch active operations
  const { data: operations = [], refetch: refetchOperations } = useQuery<MachineOperation[]>({
    queryKey: ['/api/operations/active'],
    queryFn: async () => {
      const opsRef = collection(db, "machine_operations");
      const q = query(
        opsRef,
        where("status", "==", "in_progress"),
        where("machineId", "in", machines.map(m => m.id))
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MachineOperation[];
    }
  });

  // Complete operation and get next recommendation
  const completeOperation = useMutation({
    mutationFn: async (operation: MachineOperation) => {
      // 1. Mark operation as completed
      const opRef = doc(db, "machine_operations", operation.id);
      await updateDoc(opRef, {
        status: 'completed',
        actualEndTime: new Date().toISOString()
      });

      // 2. Get recommendations for next product
      const recsRef = collection(db, "machine_recommendations");
      const q = query(
        recsRef,
        where("threadColor", "==", operation.threadColor),
        orderBy("priority", "desc")
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MachineRecommendation[];
    },
    onSuccess: (recommendations) => {
      toast({
        title: "Đã hoàn thành sản phẩm",
        description: recommendations.length > 0 
          ? "Có gợi ý sản phẩm tiếp theo phù hợp"
          : "Không có gợi ý sản phẩm phù hợp"
      });
      refetchOperations();
      refetchMachines();
    }
  });

  if (!machineGroup) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhóm máy</h1>
          <p className="text-muted-foreground">
            Người quản lý: {machineGroup.managerName}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách máy được phân công</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máy</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Màu chỉ hiện tại</TableHead>
                <TableHead>Sản phẩm đang làm</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => {
                const operation = operations.find(op => op.machineId === machine.id);
                
                return (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium">{machine.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {operation ? (
                          <>
                            <Play className="w-4 h-4 text-green-500" />
                            <span>Đang hoạt động</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 text-yellow-500" />
                            <span>Đang rảnh</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {machine.currentThreadColor && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: machine.currentThreadColor }}
                          />
                          {THREAD_COLORS.find(c => c.hex === machine.currentThreadColor)?.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {operation?.productName || 'Không có'}
                    </TableCell>
                    <TableCell>
                      {operation && (
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1">
                            <Timer className="w-4 h-4" />
                            Bắt đầu: {new Date(operation.startTime).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <ArrowRight className="w-4 h-4" />
                            Dự kiến: {new Date(operation.estimatedEndTime).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {operation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMachine(machine);
                            completeOperation.mutate(operation);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Hoàn thành
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog hiển thị gợi ý sản phẩm tiếp theo */}
      <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gợi ý sản phẩm tiếp theo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Hiển thị danh sách gợi ý */}
            <p>Các sản phẩm phù hợp với màu chỉ hiện tại của máy {selectedMachine?.name}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
