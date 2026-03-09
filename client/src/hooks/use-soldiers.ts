import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertSoldier, UpdateSoldierRequest, Soldier } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSoldiers(params?: { search?: string; archived?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set("search", params.search);
  if (params?.archived) queryParams.set("archived", params.archived);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const url = `${api.soldiers.list.path}${queryString}`;

  return useQuery({
    queryKey: [api.soldiers.list.path, params],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب بيانات الأفراد");
      const data = await res.json();
      return api.soldiers.list.responses[200].parse(data);
    },
  });
}

export function useSoldier(id: number) {
  return useQuery({
    queryKey: [api.soldiers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.soldiers.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("فشل في جلب بيانات الفرد");
      const data = await res.json();
      return api.soldiers.get.responses[200].parse(data);
    },
    enabled: !!id,
  });
}

export function useCreateSoldier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertSoldier) => {
      const res = await fetch(api.soldiers.create.path, {
        method: api.soldiers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.soldiers.create.responses[400].parse(json);
          throw new Error(error.message);
        }
        throw new Error("حدث خطأ أثناء إضافة الفرد");
      }
      return api.soldiers.create.responses[201].parse(json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.soldiers.list.path] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم تسجيل الفرد الجديد في النظام",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "خطأ في الإضافة",
        description: error.message,
      });
    }
  });
}

export function useUpdateSoldier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateSoldierRequest) => {
      const url = buildUrl(api.soldiers.update.path, { id });
      const res = await fetch(url, {
        method: api.soldiers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.soldiers.update.responses[400].parse(json);
          throw new Error(error.message);
        }
        if (res.status === 404) throw new Error("الفرد غير موجود");
        throw new Error("حدث خطأ أثناء تحديث الفرد");
      }
      return api.soldiers.update.responses[200].parse(json);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.soldiers.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.soldiers.get.path, variables.id] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم حفظ التعديلات على بيانات الفرد",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "خطأ في التحديث",
        description: error.message,
      });
    }
  });
}
