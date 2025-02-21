
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Warehouse() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "shopify_orders"));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  // Tổng hợp sản phẩm từ các đơn hàng
  const products = orders?.reduce((acc: any[], order: any) => {
    if (order.products) {
      order.products.forEach((product: any) => {
        const existingProduct = acc.find(p => p.sku === product.sku);
        if (existingProduct) {
          existingProduct.quantity += product.quantity;
        } else {
          acc.push({
            name: product.name,
            sku: product.sku,
            quantity: product.quantity,
            orderRef: order.orderNumber
          });
        }
      });
    }
    return acc;
  }, []);

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Kho hàng</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách sản phẩm từ đơn hàng</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Đơn hàng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>#{product.orderRef}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
