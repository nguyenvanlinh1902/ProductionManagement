
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { SewingMachine } from "@/lib/types";

export default function MachineMonitor() {
  const { data: machines = [] } = useQuery<SewingMachine[]>({
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Theo dõi trạng thái máy</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {machines.map((machine) => (
          <Card key={machine.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Máy #{machine.id}</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  machine.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                } text-white`}>
                  {machine.status === 'active' ? 'Đang hoạt động' : 'Dừng'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Người vận hành:</strong> {machine.operator}</p>
                <p><strong>Màu chỉ:</strong> {machine.threadColor}</p>
                <p><strong>Sản phẩm:</strong> {machine.currentProduct || 'Không có'}</p>
                <p><strong>Thời gian hoạt động:</strong> {machine.uptime || '0'} phút</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
