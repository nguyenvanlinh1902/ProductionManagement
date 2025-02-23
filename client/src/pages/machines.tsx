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
} from "firebase/firestore";
import type { SewingMachine, MachineRecommendation } from "@/lib/types";
import { THREAD_COLORS, MACHINE_STATUSES } from "@/lib/constants";

export default function Machines() {
  const [selectedMachine, setSelectedMachine] = useState<SewingMachine | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
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
        <Button onClick={() => {
          setSelectedMachine(null);
          setIsUpdateDialogOpen(true);
        }}>
          Thêm máy mới
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="recommendations">Gợi ý & Hướng dẫn</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
              mutateAction.mutate({
                name: formData.get('name') as string,
                managerId: formData.get('managerId') as string,
                managerName: formData.get('managerName') as string,
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
                  />
                </div>
                <div>
                  <Label>ID người quản lý</Label>
                  <Input
                    name="managerId"
                    required
                  />
                </div>
                <div>
                  <Label>Tên người quản lý</Label>
                  <Input
                    name="managerName"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <Label>Trạng thái</Label>
              <select
                name="status"
                className="w-full"
                defaultValue={selectedMachine?.status}
              >
                {MACHINE_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Màu chỉ hiện tại</Label>
              <select
                name="threadColor"
                className="w-full"
                defaultValue={selectedMachine?.currentThreadColor}
              >
                <option value="">Chọn màu chỉ</option>
                {THREAD_COLORS.map(color => (
                  <option key={color.id} value={color.hex}>
                    {color.name}
                  </option>
                ))}
              </select>
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