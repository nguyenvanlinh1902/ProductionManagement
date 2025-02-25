import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Play, Pause, CheckCircle2, Timer, ArrowRight, AlertTriangle } from "lucide-react";
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
import { cn } from "@/lib/utils"; 

export default function MachineGroupView() {
  const { toast } = useToast();
  const [selectedMachine, setSelectedMachine] = useState<SewingMachine | null>(null);
  const [completionDialog, setCompletionDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null); 
  

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
    },
    enabled: userRole !== 'admin'
  });

  // Get effective group ID based on role and selection
  const effectiveGroupId = userRole === 'admin' ? selectedGroupId : machineGroup?.id;

  // Fetch machines in group
  const { data: machines = [], refetch: refetchMachines } = useQuery<SewingMachine[]>({
    queryKey: ['/api/machines', effectiveGroupId],
    enabled: !!effectiveGroupId,
    queryFn: async () => {
      if (!effectiveGroupId) return [];

      const machinesRef = collection(db, "sewing_machines");
      const snapshot = await getDocs(
        query(machinesRef, where("id", "in", allGroups.find(g => g.id === effectiveGroupId)?.machineIds || machineGroup?.machineIds || []))
      );

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SewingMachine[];
    }
  });

  // Fetch active operations
  const { data: operations = [], refetch: refetchOperations } = useQuery<MachineOperation[]>({
    queryKey: ['/api/operations/active', effectiveGroupId],
    enabled: !!effectiveGroupId,
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

  if (!machineGroup && !selectedGroupId) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nhóm máy</h1>
          <p className="text-muted-foreground">
            Người quản lý: {machineGroup?.managerName}
            </p>
          )}
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
                      <div className={cn(
                        "flex items-center gap-2 p-2 rounded-lg",
                        operation ? "bg-green-50" : "bg-yellow-50",
                        operation && "animate-pulse"
                      )}>
                        {operation ? (
                          <>
                            <Play className="w-4 h-4 text-green-500" />
                            <span className="text-green-700">Đang hoạt động</span>
                          </>
                        ) : machine.status === 'maintenance' ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-red-700">Đang bảo trì</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 text-yellow-500" />
                            <span className="text-yellow-700">Đang rảnh</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {machine.currentThreadColor && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border" 
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
                          <div className="flex items-center gap-1 text-gray-600">
                            <Timer className="w-4 h-4" />
                            Bắt đầu: {new Date(operation.startTime).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
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
                          className="hover:bg-green-50 hover:text-green-600 hover:border-green-200"
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