
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { SewingMachine } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MachineMonitor() {
  const { data: machines = [], isLoading } = useQuery<SewingMachine[]>({
    queryKey: ['machines'],
    queryFn: async () => {
      const machinesRef = collection(db, "sewing_machines");
      const snapshot = await getDocs(machinesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SewingMachine[];
    }
  });

  if (isLoading) return <div>Đang tải...</div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Theo dõi trạng thái máy</h1>
        <Badge variant="outline">{machines.length} máy</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <Card key={machine.id} className={cn(
            "transition-all duration-200",
            machine.status === 'working' && "border-green-500"
          )}>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center">
                <span>{machine.name}</span>
                <Badge 
                  variant={machine.status === 'working' ? "success" : "secondary"}
                  className="capitalize"
                >
                  {machine.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Người vận hành:</span>
                <span>{machine.managerName}</span>
                <span className="text-muted-foreground">Màu chỉ:</span>
                <span>{machine.currentThreadColor || "Chưa có"}</span>
                <span className="text-muted-foreground">Sản phẩm:</span>
                <span>{machine.currentProduct || "Chưa có"}</span>
                <span className="text-muted-foreground">Thời gian:</span>
                <span>{machine.workingTime || "0"} phút</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
