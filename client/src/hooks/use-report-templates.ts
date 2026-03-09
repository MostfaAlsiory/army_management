import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReportTemplate, InsertReportTemplate } from "@shared/schema";

export function useReportTemplates() {
  const { toast } = useToast();

  const query = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (template: InsertReportTemplate) => {
      const res = await apiRequest("POST", "/api/report-templates", template);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "تم الحفظ",
        description: "تم إضافة قالب التقرير بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertReportTemplate> }) => {
      const res = await apiRequest("PATCH", `/api/report-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث قالب التقرير بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/report-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف القالب بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    ...query,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
