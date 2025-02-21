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
import { Upload, PlusCircle, Download, Eye } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { useForm } from "react-hook-form";
import Papa from 'papaparse';
import QRCode from "qrcode";

interface CSVRow {
  Name: string;
  Email: string;
  'Lineitem name': string;
  'Lineitem quantity': string;
  'Lineitem price': string;
  'Lineitem sku': string;
  'Billing Name': string;
  Phone: string;
  'Billing Address1': string;
  Notes: string;
  'Paid at': string;
  Total: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Product {
  name: string;
  quantity: number;
  price: number;
  sku: string;
  specifications: string;
}

interface ShopifyOrder {
  id: string;
  orderNumber: string;
  customer: Customer;
  products: Product[];
  status: 'pending' | 'in_production' | 'completed';
  notes: string;
  createdAt: string;
  deadline: string | null;
  total: number;
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

export default function Orders() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { toast } = useToast();
  const form = useForm<OrderFormData>();

  const { data: orders = [], isLoading, refetch } = useQuery<ShopifyOrder[]>({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const ordersRef = collection(db, "shopify_orders");
      const q = query(ordersRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShopifyOrder[];
    }
  });

  const importOrders = useMutation({
    mutationFn: async (file: File) => {
      return new Promise((resolve, reject) => {
        Papa.parse<CSVRow>(file, {
          header: true,
          complete: async (results) => {
            try {
              for (const row of results.data) {
                if (!row.Name || !row.Email) continue;

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

                await addDoc(collection(db, "shopify_orders"), {
                  orderNumber: row.Name,
                  customer: {
                    email: row.Email,
                    name: row['Billing Name'] || '',
                    phone: row.Phone || '',
                    address: row['Billing Address1'] || ''
                  },
                  products,
                  status: 'pending',
                  notes: row.Notes || '',
                  createdAt: new Date().toISOString(),
                  deadline: row['Paid at'] || null,
                  total: parseFloat(row.Total) || 0
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

  const handleOrderSelect = (order: ShopifyOrder) => {
    setSelectedOrder(order);
    QRCode.toDataURL(`Order ID: ${order.orderNumber}, Customer: ${order.customer.name}`)
      .then(url => setQrCode(url))
      .catch(err => console.error(err));
  };

  const handleCloseDialog = () => {
    setSelectedOrder(null);
    setQrCode(null);
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
              <TableHead>Chi tiết</TableHead>
              <TableHead>QR Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>
                  <div>
                    <div>{order.customer?.name || 'Không có tên'}</div>
                    <div className="text-sm text-muted-foreground">{order.customer?.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {order.products?.map((p, index) => (
                    <div key={index}>
                      {p.name} x {p.quantity}
                    </div>
                  ))}
                </TableCell>
                <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total || 0)}</TableCell>
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
                <TableCell>
                  <Button onClick={() => handleOrderSelect(order)} variant="ghost" asChild>
                    <Eye className="h-4 w-4"/>
                  </Button>
                </TableCell>
                <TableCell>
                  <Button onClick={() => handleOrderSelect(order)} variant="ghost" asChild>
                    <Download className="h-4 w-4"/>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={selectedOrder !== null} onOpenChange={handleCloseDialog}>
        <DialogHeader>
          <DialogTitle>Chi tiết đơn hàng #{selectedOrder?.orderNumber}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {/* Display order details here */}
          <div>
            <h2>Khách hàng:</h2>
            <p>Tên: {selectedOrder?.customer.name}</p>
            <p>Email: {selectedOrder?.customer.email}</p>
            <p>Điện thoại: {selectedOrder?.customer.phone}</p>
            <p>Địa chỉ: {selectedOrder?.customer.address}</p>
          </div>
          <div>
            <h2>Sản phẩm:</h2>
            <ul>
              {selectedOrder?.products.map((product) => (
                <li key={product.name}>
                  {product.name} x {product.quantity}
                </li>
              ))}
            </ul>
          </div>
          <div>
              <h2>Tổng tiền:</h2>
              <p>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedOrder?.total || 0)}</p>
          </div>
          {qrCode && (
            <div>
              <h2>Mã QR:</h2>
              <img src={qrCode} alt="QR Code" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}