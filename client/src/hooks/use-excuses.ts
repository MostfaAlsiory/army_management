import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Excuse, InsertExcuse, UpdateExcuseRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useExcuses(soldierId?: string, date?: string) {
  const queryParams = new URLSearchParams();
  if (soldierId) queryParams.set("soldierId", soldierId);
  if (date) queryParams.set("date", date);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const url = `${api.excuses.list.path}${queryString}`;

  return useQuery<Excuse[]>({
    queryKey: [api.excuses.list.path, { soldierId, date }],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("فشل في جلب الأعذار");
      return res.json();
    },
  });
}

export function useCreateExcuse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (excuse: InsertExcuse) => {
      const res = await fetch(api.excuses.create.path, {
        method: api.excuses.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(excuse),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء إضافة العذر");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.excuses.list.path] });
      toast({ title: "تمت الإضافة بنجاح", description: "تم تسجيل العذر" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });
}

export function useUpdateExcuse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateExcuseRequest & { id: number }) => {
      const res = await fetch(api.excuses.update.path.replace(":id", id.toString()), {
        method: api.excuses.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء تحديث العذر");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.excuses.list.path] });
      toast({ title: "تم التحديث بنجاح", description: "تم تعديل بيانات العذر" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });
}

export function useDeleteExcuse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api.excuses.delete.path.replace(":id", id.toString()), {
        method: api.excuses.delete.method,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء حذف العذر");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.excuses.list.path] });
      toast({ title: "تم الحذف بنجاح", description: "تم حذف العذر" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });
}
