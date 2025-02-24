import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Play, Pause, AlertTriangle, Clock, ArrowRight } from "lucide-react";
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
  where,
} from "firebase/firestore";
import type { SewingMachine, MachineRecommendation } from "@/lib/types";
import { THREAD_COLORS, MACHINE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Machines() {
  const [selectedMachine, setSelectedMachine] = useState<SewingMachine | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Fetch managers list
  const { data: managers = [] } = useQuery({
    queryKey: ['/api/users/managers'],
    queryFn: async () => {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "machine_manager"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

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

  // Add/Update machine
  const mutateAction = useMutation({
    mutationFn: async (data: Partial<SewingMachine>) => {
      if (selectedMachine) {
        // Update existing machine
        const machineRef = doc(db, "sewing_machines", selectedMachine.id);
        await updateDoc(machineRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Add new machine
        await addDoc(collection(db, "sewing_machines"), {
          ...data,
          status: 'idle',
          createdAt: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: selectedMachine ? "Đã cập nhật máy" : "Đã thêm máy mới"
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

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Quản lý máy khâu</h1>
        <Button 
          onClick={() => {
            setSelectedMachine(null);
            setIsUpdateDialogOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          Thêm máy mới
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="recommendations">Gợi ý & Hướng dẫn</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách máy</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
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
                  {machines.map((machine) => (
                    <TableRow key={machine.id} className={cn(
                      machine.status === 'working' && "animate-pulse bg-green-50/50"
                    )}>
                      <TableCell className="font-medium">{machine.name}</TableCell>
                      <TableCell>{machine.managerName}</TableCell>
                      <TableCell>
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full w-fit",
                          machine.status === 'working' && "bg-green-100 text-green-800",
                          machine.status === 'idle' && "bg-yellow-100 text-yellow-800",
                          machine.status === 'maintenance' && "bg-red-100 text-red-800"
                        )}>
                          {machine.status === 'working' ? (
                            <Play className="w-4 h-4" />
                          ) : machine.status === 'idle' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <AlertTriangle className="w-4 h-4" />
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
                              className="w-4 h-4 rounded-full border" 
                              style={{ backgroundColor: machine.currentThreadColor }}
                            />
                            {THREAD_COLORS.find(c => c.hex === machine.currentThreadColor)?.name || 
                             machine.currentThreadColor}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {machine.currentProductName || 'Không có'}
                      </TableCell>
                      <TableCell>
                        {machine.status === 'working' && machine.startTime && (
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="w-4 h-4" />
                              Bắt đầu: {new Date(machine.startTime).toLocaleTimeString()}
                            </div>
                            {machine.estimatedEndTime && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <ArrowRight className="w-4 h-4" />
                                Dự kiến: {new Date(machine.estimatedEndTime).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">SP001 - Áo thun</div>
                          <div className="text-muted-foreground">
                            Thời gian ước tính: 30 phút
                          </div>
                        </div>
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
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Gợi ý và Hướng dẫn Sản xuất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {machines.map(machine => {
                  const recs = getRecommendationsForMachine(machine.id);
                  return (
                    <Card key={machine.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{machine.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {recs.map((rec, index) => (
                            <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                              <div className="flex-shrink-0">
                                {index === 0 ? (
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                                    1
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center">
                                    {index + 1}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium">{rec.reason}</h4>
                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {rec.estimatedTime} phút
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div 
                                      className="w-4 h-4 rounded-full" 
                                      style={{ backgroundColor: rec.threadColor }}
                                    />
                                    {THREAD_COLORS.find(c => c.hex === rec.threadColor)?.name || rec.threadColor}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline Sản xuất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {machines.map(machine => (
                  <div key={machine.id} className="space-y-4">
                    <h3 className="font-medium">{machine.name}</h3>
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-8 pl-6">
                        {/* Timeline items go here - will be populated with real data */}
                        <div className="relative">
                          <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="font-medium">Bắt đầu sản xuất SP001</div>
                              <div className="text-sm text-muted-foreground">9:00 AM</div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium">Dự kiến hoàn thành</div>
                              <div className="text-sm text-muted-foreground">10:30 AM</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedMachine ? 'Cập nhật trạng thái máy' : 'Thêm máy mới'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const manager = managers.find(m => m.id === formData.get('managerId'));
              mutateAction.mutate({
                name: formData.get('name') as string,
                managerId: formData.get('managerId') as string,
                managerName: manager ? manager.name : '',
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
            {!selectedMachine && (
              <>
                <div>
                  <Label>Tên máy</Label>
                  <Input
                    name="name"
                    required
                    placeholder="Nhập tên máy"
                  />
                </div>
                <div>
                  <Label>Người quản lý</Label>
                  <Select name="managerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người quản lý" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>Trạng thái</Label>
              <Select 
                name="status" 
                defaultValue={selectedMachine?.status}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Màu chỉ hiện tại</Label>
              <Select 
                name="threadColor"
                defaultValue={selectedMachine?.currentThreadColor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn màu chỉ" />
                </SelectTrigger>
                <SelectContent>
                  {THREAD_COLORS.map(color => (
                    <SelectItem key={color.id} value={color.hex}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border" 
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sản phẩm đang làm</Label>
              <Input
                name="productName"
                defaultValue={selectedMachine?.currentProductName}
                placeholder="Nhập tên sản phẩm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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