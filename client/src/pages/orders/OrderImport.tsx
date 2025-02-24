import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  OrderImport,
  orderImportSchema
} from "@/lib/types";

const PRODUCT_TYPES = [
  { value: 'EMBROIDERY', label: 'Thêu' },
  { value: 'DTF_PRINTING', label: 'In DTF' },
  { value: 'DTG_PRINTING', label: 'In DTG' }
];

const PRINT_LOCATIONS = [
  { value: 'LEFT_CHEST', label: 'Ngực trái' },
  { value: 'CENTERED', label: 'Giữa (30x40 cm)' },
  { value: 'LARGE_CENTER', label: 'Giữa lớn (60x60 cm)' }
];

const EMBROIDERY_LOCATIONS = [
  { value: 'LEFT_CHEST', label: 'Ngực trái' },
  { value: 'RIGHT_CHEST', label: 'Ngực phải' },
  { value: 'CENTERED', label: 'Giữa' },
  { value: 'LARGE_CENTER', label: 'Giữa lớn' }
];

const ADDITIONAL_LOCATIONS = [
  { value: 'LEFT_SLEEVE', label: 'Tay áo trái' },
  { value: 'RIGHT_SLEEVE', label: 'Tay áo phải' },
  { value: 'BACK_LOCATION', label: 'Mặt sau' },
  { value: 'SPECIAL_LOCATION', label: 'Vị trí đặc biệt' }
];

const SALES_CHANNELS = [
  { value: 'tiktok', label: 'Tiktok - Ship by Seller' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'facebook', label: 'Facebook' }
];

interface Props {
  onImport: (data: OrderImport) => Promise<void>;
}

export default function OrderImport({ onImport }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [productType, setProductType] = useState<'EMBROIDERY' | 'DTF_PRINTING' | 'DTG_PRINTING'>('DTF_PRINTING');

  const form = useForm<OrderImport>({
    resolver: zodResolver(orderImportSchema),
    defaultValues: {
      productType: 'DTF_PRINTING',
      products: [
        {
          name: '',
          sku: '',
          price: 0,
          color: '',
          size: '',
          quantity: 1,
          mainLocation: '',
          hasProductionFile: false
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products"
  });

  const locations = productType === 'EMBROIDERY' ? EMBROIDERY_LOCATIONS : PRINT_LOCATIONS;

  const onSubmit = async (data: OrderImport) => {
    try {
      await onImport(data);
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error importing order:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Import đơn hàng
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import đơn hàng mới</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại sản phẩm</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value: typeof field.value) => {
                        field.onChange(value);
                        setProductType(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại sản phẩm" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salesChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kênh bán hàng</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn kênh bán" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SALES_CHANNELS.map(channel => (
                          <SelectItem key={channel.value} value={channel.value}>
                            {channel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã đơn hàng</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập mã đơn hàng" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên khách hàng</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nhập tên khách hàng" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Sản phẩm {index + 1}</h4>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`products.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên sản phẩm</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nhập tên sản phẩm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`products.${index}.sku`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nhập SKU" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`products.${index}.color`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Màu sắc</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nhập màu sắc" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`products.${index}.size`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kích thước</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nhập size" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`products.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Giá</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              step="0.01"
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              placeholder="Nhập giá" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`products.${index}.mainLocation`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {productType === 'EMBROIDERY' ? 'Vị trí thêu chính' : 'Vị trí in chính'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn vị trí" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map(loc => (
                                <SelectItem key={loc.value} value={loc.value}>
                                  {loc.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`products.${index}.additionalLocations`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vị trí phụ</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value ? value.split(',') : []);
                            }}
                            value={field.value?.join(',')}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Chọn vị trí phụ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ADDITIONAL_LOCATIONS.map(loc => (
                                <SelectItem key={loc.value} value={loc.value}>
                                  {loc.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`products.${index}.designUrl`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link design & mockup</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nhập link design" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`products.${index}.hasProductionFile`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {productType === 'EMBROIDERY' ? 'File thêu' : 'File in'}
                          </FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === 'true')}
                            value={field.value ? 'true' : 'false'}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="true">Có file</SelectItem>
                              <SelectItem value="false">Chưa có file</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({
                  name: '',
                  sku: '',
                  price: 0,
                  color: '',
                  size: '',
                  quantity: 1,
                  mainLocation: '',
                  hasProductionFile: false
                })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit">Import đơn hàng</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
