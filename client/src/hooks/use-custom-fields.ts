import { useQuery, useMutation } from "@tanstack/react-query";
  import { queryClient, apiRequest } from "@/lib/queryClient";
  import type { CustomField, InsertCustomField } from "@shared/schema";
  import { useToast } from "@/hooks/use-toast";

  export function useCustomFields(entityType?: string) {
    return useQuery<CustomField[]>({
      queryKey: entityType ? ["/api/custom-fields", entityType] : ["/api/custom-fields"],
      queryFn: async () => {
        const url = entityType ? `/api/custom-fields?entityType=${entityType}` : "/api/custom-fields";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch custom fields");
        return res.json();
      }
    });
  }

  export function useCreateCustomField() {
    const { toast } = useToast();
    return useMutation({
      mutationFn: async (field: InsertCustomField) => {
        const res = await apiRequest("POST", "/api/custom-fields", field);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
        toast({ title: "تم إضافة الحقل بنجاح" });
      },
      onError: () => {
        toast({ title: "فشل إضافة الحقل", variant: "destructive" });
      }
    });
  }

  export function useUpdateCustomField() {
    const { toast } = useToast();
    return useMutation({
      mutationFn: async ({ id, ...updates }: Partial<InsertCustomField> & { id: number }) => {
        const res = await apiRequest("PATCH", `/api/custom-fields/${id}`, updates);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
        toast({ title: "تم تحديث الحقل بنجاح" });
      },
      onError: () => {
        toast({ title: "فشل تحديث الحقل", variant: "destructive" });
      }
    });
  }

  export function useDeleteCustomField() {
    const { toast } = useToast();
    return useMutation({
      mutationFn: async (id: number) => {
        await apiRequest("DELETE", `/api/custom-fields/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
        toast({ title: "تم حذف الحقل بنجاح" });
      },
      onError: () => {
        toast({ title: "فشل حذف الحقل", variant: "destructive" });
      }
    });
  }
  