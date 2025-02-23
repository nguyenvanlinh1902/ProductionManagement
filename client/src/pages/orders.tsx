import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Eye, PencilIcon } from "lucide-react";
import { useLocation } from "wouter";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { storage } from "@/lib/firebase"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { ShopifyOrder } from "@/lib/types";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";

type OrderFormData = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  products: {
    name: string;
    quantity: number;
    color?: string;
    size?: string;
    embroideryPositions?: {
      name: string;
      description: string;
      designUrl?: string;
    }[];
  }[];
};

export default function Orders() {
  const [_, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
  const { toast } = useToast();
  const form = useForm<OrderFormData>();

  // Get orders list
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

  // Upload design image
  const uploadDesign = async (file: File, orderId: string, positionId: string) => {
    try {
      const fileRef = ref(storage, `designs/${orderId}/${positionId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading design:', error);
      throw error;
    }
  };

  // Update order
  const updateOrder = useMutation({
    mutationFn: async (data: { id: string; formData: OrderFormData }) => {
      const { id, formData } = data;
      await updateDoc(doc(db, "shopify_orders", id), {
        customer: formData.customer,
        products: formData.products
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin đơn hàng"
      });
      setIsEditMode(false);
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

  const handleOrderSelect = async (order: ShopifyOrder) => {
    if (!order.qrCode) {
      try {
        const qrData = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          products: order.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            color: p.color,
            size: p.size,
            embroideryPositions: p.embroideryPositions || []
          }))
        };

        const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));
        order.qrCode = qrCodeDataUrl;
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedOrder(order);
    setIsOpen(true);

    // Reset form with current order data
    if (order) {
      form.reset({
        customer: order.customer,
        products: order.products
      });
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!selectedOrder) return;
    updateOrder.mutate({ id: selectedOrder.id, formData: data });
  };

  const handleDesignUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    productIndex: number,
    positionIndex: number
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedOrder) return;

    try {
      const downloadUrl = await uploadDesign(
        file,
        selectedOrder.id,
        `product_${productIndex}_position_${positionIndex}`
      );

      // Update form data with new design URL
      const products = form.getValues('products');
      if (products[productIndex]?.embroideryPositions?.[positionIndex]) {
        products[productIndex].embroideryPositions[positionIndex].designUrl = downloadUrl;
        form.setValue('products', products);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: "Không thể tải lên file design: " + error.message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Đơn hàng</h1>
        <div className="w-full sm:w-auto flex gap-2">
          <Button
            onClick={() => navigate('/shopify')}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Đồng bộ Shopify
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Mã đơn</TableHead>
              <TableHead className="whitespace-nowrap">Khách hàng</TableHead>
              <TableHead className="whitespace-nowrap">Sản phẩm</TableHead>
              <TableHead className="whitespace-nowrap">Trạng thái</TableHead>
              <TableHead className="whitespace-nowrap">Tiến độ</TableHead>
              <TableHead className="whitespace-nowrap">Ngày tạo</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>
                  <div className="min-w-[180px]">
                    <div className="font-medium truncate">{order.customer?.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {order.customer?.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-[200px]">
                    {order.products?.map((product, index) => (
                      <div key={index} className="text-sm">
                        <div className="truncate">
                          {product.name} ({product.size || 'N/A'}) x {product.quantity}
                        </div>
                        {product.embroideryPositions && product.embroideryPositions.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            Vị trí thêu: {product.embroideryPositions.map(p => p.name).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TableCell>
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
                <TableCell>
                  <div className="min-w-[150px] space-y-1">
                    {order?.stages?.map(stage => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          stage.status === 'completed' ? 'bg-green-500' :
                          stage.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-xs whitespace-nowrap">{stage.name}</span>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleOrderSelect(order)}
                      variant="ghost"
                      size="icon"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {order.qrCode && (
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = order.qrCode!;
                          link.download = `order-${order.orderNumber}-qr.png`;
                          link.click();
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOrderSelect(order)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Chi tiết đơn hàng #{selectedOrder?.orderNumber}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {isEditMode ? 'Hủy' : 'Chỉnh sửa'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <>
              {isEditMode ? (
                // Edit form
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Thông tin khách hàng</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customer.name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tên</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customer.email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customer.phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Số điện thoại</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="customer.address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Địa chỉ</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Sản phẩm</h3>
                      {form.watch('products')?.map((product, productIndex) => (
                        <div key={productIndex} className="border rounded-lg p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`products.${productIndex}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tên sản phẩm</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`products.${productIndex}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Số lượng</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`products.${productIndex}.color`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Màu sắc</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`products.${productIndex}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Kích thước</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium">Vị trí thêu</h4>
                            {product.embroideryPositions?.map((pos, posIndex) => (
                              <div key={posIndex} className="border-t pt-2 space-y-2">
                                <FormField
                                  control={form.control}
                                  name={`products.${productIndex}.embroideryPositions.${posIndex}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Tên vị trí</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`products.${productIndex}.embroideryPositions.${posIndex}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Mô tả</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <div>
                                  <FormLabel>File design</FormLabel>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleDesignUpload(e, productIndex, posIndex)}
                                    />
                                    {pos.designUrl && (
                                      <a
                                        href={pos.designUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline"
                                      >
                                        Xem design
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditMode(false)}
                      >
                        Hủy
                      </Button>
                      <Button type="submit">Lưu thay đổi</Button>
                    </div>
                  </form>
                </Form>
              ) : (
                // View mode
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Thông tin khách hàng</h3>
                      <div className="space-y-1 text-sm">
                        <p>Tên: {selectedOrder.customer?.name}</p>
                        <p>Email: {selectedOrder.customer?.email}</p>
                        <p>SĐT: {selectedOrder.customer?.phone}</p>
                        <p>Địa chỉ: {selectedOrder.customer?.address}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Sản phẩm</h3>
                      {selectedOrder.products?.map((product, index) => (
                        <div key={index} className="border-t pt-2 first:border-t-0">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Màu: {product.color || 'N/A'}, Size: {product.size || 'N/A'}
                          </div>
                          <div className="text-sm">Số lượng: {product.quantity}</div>
                          {product.embroideryPositions && product.embroideryPositions.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium">Vị trí thêu:</div>
                              <ul className="list-disc list-inside text-sm">
                                {product.embroideryPositions.map((pos, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <span>{pos.name}</span>
                                    {pos.designUrl && (
                                      <a
                                        href={pos.designUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:underline"
                                      >
                                        Xem design
                                      </a>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Mã QR</h3>
                    {selectedOrder.qrCode && (
                      <div className="bg-white p-4 rounded-lg">
                        <img
                          src={selectedOrder.qrCode}
                          alt="QR Code"
                          className="w-40 h-40 mx-auto"
                        />
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = selectedOrder.qrCode!;
                            link.download = `order-${selectedOrder.orderNumber}-qr.png`;
                            link.click();
                          }}
                          variant="outline"
                          className="w-full mt-4"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Tải mã QR
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}