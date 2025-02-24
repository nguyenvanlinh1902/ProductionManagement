
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Pencil, Trash2 } from "lucide-react";

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
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
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
      setEditingStage(null);
      form.reset();
      refetch();
    }
  });

  const onSubmit = async (data: StageFormData) => {
    const newStages = [...stages];
    if (editingStage) {
      // Edit existing stage
      const index = newStages.findIndex(s => s.id === editingStage.id);
      if (index !== -1) {
        newStages[index] = {
          ...newStages[index],
          id: data.id,
          name: data.name
        };
      }
    } else {
      // Add new stage
      newStages.push({
        id: data.id,
        name: data.name,
        order: newStages.length + 1
      });
    }
    updateStages.mutate(newStages);
  };

  const handleEdit = (stage: Stage) => {
    setEditingStage(stage);
    form.reset({
      id: stage.id,
      name: stage.name
    });
    setIsOpen(true);
  };

  const handleDelete = (stageId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa công đoạn này?")) {
      const newStages = stages.filter(s => s.id !== stageId)
        .map((s, index) => ({ ...s, order: index + 1 }));
      updateStages.mutate(newStages);
    }
  };

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quản lý công đoạn sản xuất</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingStage(null);
                form.reset({ id: "", name: "" });
              }}>
                Thêm công đoạn
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStage ? "Sửa công đoạn" : "Thêm công đoạn mới"}
                </DialogTitle>
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
                          <Input placeholder="VD: CUTTING" {...field} />
                        </FormControl>
                        <FormMessage />
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
                          <Input placeholder="VD: Cắt vải" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {editingStage ? "Cập nhật" : "Thêm công đoạn"}
                  </Button>
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
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage: Stage) => (
                <TableRow key={stage.id}>
                  <TableCell>{stage.id}</TableCell>
                  <TableCell>{stage.name}</TableCell>
                  <TableCell>{stage.order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(stage)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
