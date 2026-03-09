import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertAttendance, Attendance } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAttendance(date?: string, from?: string, to?: string, soldierId?: string) {
  const queryParams = new URLSearchParams();
  if (date) queryParams.set("date", date);
  if (from) queryParams.set("from", from);
  if (to) queryParams.set("to", to);
  if (soldierId) queryParams.set("soldierId", soldierId);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const url = `${api.attendance.list.path}${queryString}`;

  return useQuery<Attendance[]>({
    queryKey: [api.attendance.list.path, { date, from, to, soldierId }],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب سجلات الحضور");
      const data = await res.json();
      return data;
    },
  });
}

export function useBulkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (records: InsertAttendance[]) => {
      const res = await fetch(api.attendance.bulkCreateOrUpdate.path, {
        method: api.attendance.bulkCreateOrUpdate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
        credentials: "include",
      });
      
      const json = await res.json();
      if (!res.ok) {
        throw new Error("حدث خطأ أثناء حفظ سجلات الحضور");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.attendance.list.path] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم تسجيل وتحديث حضور وانصراف الأفراد",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: error.message,
      });
    }
  });
}

export function useAbsenceReport(month?: string) {
  const queryParams = new URLSearchParams();
  if (month) queryParams.set("month", month);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
  const url = `${api.attendance.report.path}${queryString}`;

  return useQuery({
    queryKey: [api.attendance.report.path, month],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("فشل في جلب تقرير الغياب");
      const data = await res.json();
      return data;
    },
  });
}
