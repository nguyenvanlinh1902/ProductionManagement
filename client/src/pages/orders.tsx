import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, PlusCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import Papa from 'papaparse';

export default function Orders() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const importOrders = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            try {
              for (const row of results.data) {
                if (!row['Name'] || !row['Email']) continue;

                // Tạo danh sách sản phẩm từ các cột Lineitem
                const products = [];
                if (row['Lineitem name']) {
                  products.push({
                    name: row['Lineitem name'],
                    quantity: parseInt(row['Lineitem quantity']) || 1,
                    price: parseFloat(row['Lineitem price']) || 0,
                    sku: row['Lineitem sku'] || '',
                    specifications: ''
                  });
                }

                await addDoc(collection(db, "orders"), {
                  orderNumber: row['Name'],
                  customer: {
                    email: row['Email'],
                    name: row['Billing Name'] || '',
                    phone: row['Phone'] || '',
                    address: row['Billing Address1'] || ''
                  },
                  products,
                  status: 'pending',
                  notes: row['Notes'] || '',
                  createdAt: new Date().toISOString(),
                  deadline: row['Paid at'] || null,
                  total: parseFloat(row['Total']) || 0
                });
              }
              resolve(true);
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã import đơn hàng"
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể import đơn hàng",
        variant: "destructive"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importOrders.mutate(file);
    }
  };

  const createOrder = useMutation({
    mutationFn: async (data: OrderFormData) => {
      await addDoc(collection(db, "orders"), {
        ...data,
        status: "pending",
        createdAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã tạo đơn hàng mới"
      });
      setIsOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể tạo đơn hàng",
        variant: "destructive"
      });
    }
  });

  const { register, handleSubmit, reset } = useForm<OrderFormData>();
  const onSubmit = (data: OrderFormData) => {
    createOrder.mutate(data);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Đơn hàng</h1>

        <div className="flex gap-2">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </span>
            </Button>
          </label>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Tạo đơn hàng
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tạo đơn hàng mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="orderNumber">Mã đơn hàng</label>
                  <input type="text" id="orderNumber" {...register("orderNumber")} placeholder="Nhập mã đơn hàng" />
                </div>
                <div>
                  <label htmlFor="customer">Khách hàng</label>
                  <input type="text" id="customer" {...register("customer")} placeholder="Tên khách hàng" />
                </div>
                <div>
                  <label htmlFor="deadline">Ngày giao hàng</label>
                  <input type="date" id="deadline" {...register("deadline")} />
                </div>
                <div>
                  <label htmlFor="notes">Ghi chú</label>
                  <textarea id="notes" {...register("notes")} placeholder="Nhập ghi chú cho đơn hàng" />
                </div>
                <Button type="submit">Tạo đơn hàng</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã đơn hàng</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Tổng tiền</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead>Ngày giao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order: any) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>
                  <div>
                    <div>{order.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{order.customer.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {order.products.map((p: any, index: number) => (
                    <div key={index}>
                      {p.name} x {p.quantity}
                    </div>
                  ))}
                </TableCell>
                <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'in_production' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'completed' ? 'Hoàn thành' :
                     order.status === 'in_production' ? 'Đang sản xuất' :
                     'Chờ xử lý'}
                  </span>
                </TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                <TableCell>{order.deadline ? new Date(order.deadline).toLocaleDateString('vi-VN') : 'Chưa xác định'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

type OrderFormData = {
  orderNumber: string;
  customer: string;
  products: {
    name: string;
    quantity: number;
    specifications: string;
  }[];
  deadline: string;
  notes: string;
};