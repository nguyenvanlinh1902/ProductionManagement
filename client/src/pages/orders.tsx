import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { getDocs, collection } from 'firebase/firestore';

export default function Orders() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch orders
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });

  // Fetch users (This part remains unused in the edited code, consider removing if unnecessary)
  // const { data: users } = useQuery({
  //   queryKey: ['users'],
  //   queryFn: async () => {
  //     const snapshot = await getDocs(collection(db, "users"));
  //     return snapshot.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data()
  //     }));
  //   }
  // });

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  const filteredOrders = searchTerm
    ? orders.filter((order: any) => order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toString().includes(searchTerm))
    : orders;


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Quản lý Đơn hàng</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Tìm kiếm đơn hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border">Mã đơn</th>
              <th className="p-2 border">Khách hàng</th>
              <th className="p-2 border">Trạng thái</th>
              <th className="p-2 border">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders?.map((order: any) => (
              <tr key={order.id}>
                <td className="p-2 border">{order.id}</td>
                <td className="p-2 border">{order.customerName}</td>
                <td className="p-2 border">{order.status}</td>
                <td className="p-2 border">
                  <Button variant="outline" size="sm">
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}