import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { login, createCollection, auth } from "@/lib/firebase";
import { useLocation } from "wouter";
import { FirebaseError } from "firebase/app";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

export default function Login() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Tạo tài khoản admin mặc định nếu chưa có
    const createAdminAccount = async () => {
      try {
        await login("admin@demo.com", "admin123");
      } catch (error) {
        if (error instanceof FirebaseError && error.code === 'auth/user-not-found') {
          // Nếu chưa có tài khoản admin, tạo mới
          const userCredential = await auth.createUserWithEmailAndPassword("admin@demo.com", "admin123");
          await createCollection("users", {
            uid: userCredential.user.uid,
            email: "admin@demo.com",
            role: "admin",
            name: "Admin"
          });
        }
      }
    };
    createAdminAccount();
  }, []);

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      await login(values.email, values.password);
      setLocation("/dashboard");
    } catch (error) {
      let message = "Email hoặc mật khẩu không đúng";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-email':
            message = "Email không hợp lệ";
            break;
          case 'auth/user-disabled':
            message = "Tài khoản đã bị vô hiệu hóa";
            break;
          case 'auth/user-not-found':
            message = "Không tìm thấy tài khoản với email này";
            break;
          case 'auth/wrong-password':
            message = "Mật khẩu không đúng";
            break;
          case 'auth/network-request-failed':
            message = "Lỗi kết nối mạng";
            break;
          case 'auth/too-many-requests':
            message = "Quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau";
            break;
        }
      }
      toast({
        title: "Lỗi đăng nhập",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">Hệ thống Quản lý Sản xuất</h1>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Nhập email" />
                    </FormControl>
                    <FormMessage />
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
                      <Input {...field} type="password" placeholder="Nhập mật khẩu" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Đăng nhập
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}