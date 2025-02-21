import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";

interface Stage {
  id: string;
  name: string;
  order: number;
}

type StageFormData = {
  id: string;
  name: string;
};

export default function Settings() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<StageFormData>();

  const { data: stages = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/settings/stages'],
    queryFn: async () => {
      const docRef = await getDoc(doc(db, "settings", "productionStages"));
      if (docRef.exists()) {
        return (docRef.data()?.stages || []) as Stage[];
      }
      return [] as Stage[];
    }
  });

  const updateStages = useMutation({
    mutationFn: async (newStages: Stage[]) => {
      await setDoc(doc(db, "settings", "productionStages"), {
        stages: newStages,
        updatedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã cập nhật công đoạn sản xuất"
      });
      setIsOpen(false);
      form.reset();
      refetch();
    }
  });

  const onSubmit = async (data: StageFormData) => {
    const newStages = [...stages];
    newStages.push({
      id: data.id,
      name: data.name,
      order: newStages.length + 1
    });
    updateStages.mutate(newStages);
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cài đặt</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Công đoạn sản xuất</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Thêm công đoạn
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm công đoạn sản xuất</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mã công đoạn</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ví dụ: cutting" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên công đoạn</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ví dụ: Cắt" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Thêm công đoạn</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã công đoạn</TableHead>
                <TableHead>Tên công đoạn</TableHead>
                <TableHead>Thứ tự</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage: Stage) => (
                <TableRow key={stage.id}>
                  <TableCell>{stage.id}</TableCell>
                  <TableCell>{stage.name}</TableCell>
                  <TableCell>{stage.order}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}