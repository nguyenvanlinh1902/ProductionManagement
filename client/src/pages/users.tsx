import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, PencilIcon } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { register } from "@/lib/firebase";

type UserFormData = {
  email: string;
  password: string;
  name: string;
  role: string;
};

export default function Users() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<UserFormData>();

  // Lấy danh sách người dùng
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  // Lấy danh sách công đoạn
  const { data: stages } = useQuery({
    queryKey: ['/api/settings/stages'],
    queryFn: async () => {
      const docRef = doc(db, "settings", "productionStages");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().stages;
      }
      return [];
    }
  });

  const createUser = useMutation({
    mutationFn: async (data: UserFormData) => {
      await register(data.email, data.password, data.role, data.name);
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã tạo tài khoản mới"
      });
      setIsOpen(false);
      form.reset();
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

  const updateUserStages = useMutation({
    mutationFn: async ({ userId, stages }: { userId: string, stages: string[] }) => {
      await setDoc(doc(db, "users", userId), {
        assignedStages: stages
      }, { merge: true });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã cập nhật công đoạn cho người dùng"
      });
      refetch();
    }
  });

  const onSubmit = (data: UserFormData) => {
    createUser.mutate(data);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Người dùng</h1>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Thêm người dùng
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Thêm người dùng mới</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="Nhập email" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} placeholder="Nhập mật khẩu" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nhập tên" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vai trò</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn vai trò" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Quản trị viên</SelectItem>
                          <SelectItem value="worker">Công nhân</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Thêm người dùng</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Công đoạn</TableHead>
                <TableHead>Trạng thái</TableHead> {/* Added this line */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    {user.role === 'admin' ? 'Quản trị viên' : 'Công nhân'}
                  </TableCell>
                  <TableCell>
                    {user.role === 'worker' && stages && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm">
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Phân công
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-4">
                            <h4 className="font-medium">Phân công công đoạn</h4>
                            <div className="space-y-2">
                              {stages.map((stage: any) => (
                                <div key={stage.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`stage-${stage.id}`}
                                    checked={user.assignedStages?.includes(stage.id)}
                                    onCheckedChange={(checked) => {
                                      const newStages = checked
                                        ? [...(user.assignedStages || []), stage.id]
                                        : (user.assignedStages || []).filter((s: string) => s !== stage.id);
                                      updateUserStages.mutate({
                                        userId: user.id,
                                        stages: newStages
                                      });
                                    }}
                                  />
                                  <label
                                    htmlFor={`stage-${stage.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                  >
                                    {stage.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                  <TableCell> {/* Added this line */}
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Hoạt động
                    </span>
                  </TableCell> {/* Added this line */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}