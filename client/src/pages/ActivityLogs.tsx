import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { ActivityLog } from "@shared/schema";
import { RotateCcw, Search, Calendar as CalendarIcon, History, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

function LogDetailsDialog({ log }: { log: ActivityLog }) {
  const oldData = log.oldData ? JSON.parse(log.oldData) : null;
  const newData = log.newData ? JSON.parse(log.newData) : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">التفاصيل</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تفاصيل الحركة #{log.id}</DialogTitle>
          <DialogDescription>
            {log.details}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <Card>
            <CardHeader className="py-3 bg-muted/50">
              <CardTitle className="text-sm font-bold text-destructive">البيانات القديمة</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto text-left" dir="ltr">
              {oldData ? JSON.stringify(oldData, null, 2) : "لا يوجد"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 bg-muted/50">
              <CardTitle className="text-sm font-bold text-primary">البيانات الجديدة</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto text-left" dir="ltr">
              {newData ? JSON.stringify(newData, null, 2) : "لا يوجد"}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UndoActionDialog({ log, onUndo }: { log: ActivityLog, onUndo: (takeBackup: boolean) => void }) {
  const [takeBackup, setTakeBackup] = useState(true);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          تراجع
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تأكيد التراجع عن الحركة</DialogTitle>
          <DialogDescription>
            هل أنت متأكد من رغبتك في إلغاء هذه الحركة؟ قد يؤدي هذا إلى استعادة البيانات القديمة أو حذف البيانات المضافة.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 space-x-reverse py-4">
          <Checkbox 
            id="backup-checkbox" 
            checked={takeBackup} 
            onCheckedChange={(checked) => setTakeBackup(checked as boolean)}
          />
          <Label htmlFor="backup-checkbox">إنشاء نسخة احتياطية من النظام قبل التراجع</Label>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button variant="destructive" onClick={() => onUndo(takeBackup)}>
            تأكيد التراجع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ActivityLogs() {
  const { toast } = useToast();
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (actionTypeFilter !== "all") params.append("actionType", actionTypeFilter);
    if (entityTypeFilter !== "all") params.append("entityType", entityTypeFilter);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return params.toString();
  };

  const { data: logs, refetch, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['activityLogs', actionTypeFilter, entityTypeFilter, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`${api.activityLogs.list.path}?${buildQueryParams()}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    }
  });

  const undoMutation = useMutation({
    mutationFn: async ({ id, takeBackup }: { id: number, takeBackup: boolean }) => {
      const undoPath = api.activityLogs.undo.path.replace(':id', id.toString());
      const res = await fetch(undoPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takeBackup })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "فشل التراجع عن الحركة");
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.backupUrl) {
        toast({
          title: "تم التراجع بنجاح",
          description: `تم أخذ نسخة احتياطية بنجاح ويمكن تحميلها.`,
        });
        setTimeout(() => window.open(data.backupUrl, '_blank'), 500);
      } else {
        toast({
          title: "تم التراجع بنجاح",
          description: data.message || "تم إلغاء الحركة واستعادة البيانات.",
        });
      }
      setTimeout(() => refetch(), 300);
    },
    onError: (err: any) => {
      const errMsg = err?.message || "فشل التراجع عن الحركة";
      console.error('Undo error:', err);
      toast({
        title: "خطأ",
        description: errMsg,
        variant: "destructive"
      });
    }
  });

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'إضافة': return 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200';
      case 'تعديل': return 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200';
      case 'حذف': return 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            سجل النظام والحركات
          </h2>
          <p className="text-muted-foreground mt-2">
            استعرض جميع حركات المستخدمين، أضف فلاتر للبحث، وتراجع عن التغييرات عند الحاجة
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">تصفية السجل</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع الحركة</label>
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="إضافة">إضافة</SelectItem>
                  <SelectItem value="تعديل">تعديل</SelectItem>
                  <SelectItem value="حذف">حذف</SelectItem>
                  <SelectItem value="إلغاء حركة">إلغاء حركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">القسم</label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="شؤون الأفراد">شؤون الأفراد</SelectItem>
                  <SelectItem value="الحضور والغياب">الحضور والغياب</SelectItem>
                  <SelectItem value="المخالفات والجزاءات">المخالفات والجزاءات</SelectItem>
                  <SelectItem value="الأعذار والإجازات">الأعذار والإجازات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">من تاريخ</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">إلى تاريخ</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px] text-right">رقم</TableHead>
                  <TableHead className="text-right">تاريخ الحركة</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">نوع الحركة</TableHead>
                  <TableHead className="text-right">التفاصيل</TableHead>
                  <TableHead className="text-center w-[200px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">جاري تحميل السجل...</TableCell>
                  </TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">لا توجد حركات مطابقة للبحث</TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">#{log.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{format(new Date(log.createdAt), 'yyyy/MM/dd')}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(log.createdAt), 'hh:mm a', { locale: arSA })}</span>
                        </div>
                      </TableCell>
                      <TableCell>{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {log.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-semibold border ${getActionBadgeColor(log.actionType)}`}>
                          {log.actionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={log.details || ''}>
                        {log.details}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <LogDetailsDialog log={log} />
                          {log.actionType !== 'إلغاء حركة' && (
                            <UndoActionDialog 
                              log={log} 
                              onUndo={(takeBackup) => undoMutation.mutate({ id: log.id, takeBackup })} 
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}