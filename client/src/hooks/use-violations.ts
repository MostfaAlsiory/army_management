import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Violation, InsertViolation, UpdateViolationRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useViolations(soldierId?: string) {
  const queryParams = new URLSearchParams();
  if (soldierId) queryParams.set("soldierId", soldierId);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const url = `${api.violations.list.path}${queryString}`;

  return useQuery<Violation[]>({
    queryKey: [api.violations.list.path, { soldierId }],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("فشل في جلب المخالفات");
      return res.json();
    },
  });
}

export function useCreateViolation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (violation: InsertViolation) => {
      const res = await fetch(api.violations.create.path, {
        method: api.violations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(violation),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء إضافة المخالفة");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.violations.list.path] });
      toast({ title: "تمت الإضافة بنجاح", description: "تم تسجيل المخالفة" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });
}

export function useUpdateViolation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateViolationRequest & { id: number }) => {
      const res = await fetch(api.violations.update.path.replace(":id", id.toString()), {
        method: api.violations.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء تحديث المخالفة");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.violations.list.path] });
      toast({ title: "تم التحديث بنجاح", description: "تم تعديل بيانات المخالفة" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });
}

export function useDeleteViolation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(api.violations.delete.path.replace(":id", id.toString()), {
        method: api.violations.delete.method,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "حدث خطأ أثناء حذف المخالفة");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.violations.list.path] });
      toast({ title: "تم الحذف بنجاح", description: "تم حذف المخالفة" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    }
  });
}
