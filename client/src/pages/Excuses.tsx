import { useState, useMemo } from "react";
import { useSoldiers } from "@/hooks/use-soldiers";
import { useExcuses, useCreateExcuse, useUpdateExcuse, useDeleteExcuse } from "@/hooks/use-excuses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Trash2, Calendar as CalendarIcon, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExcuseSchema, type Excuse, type Soldier } from "@shared/schema";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

const EXCUSE_TYPES = ["إجازة", "مرض", "مهمة", "غياب", "سجن"];

export default function Excuses() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExcuse, setSelectedExcuse] = useState<Excuse | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  
  const { data: soldiers, isLoading: isLoadingSoldiers } = useSoldiers({ archived: "false" });
  const { data: excuses, isLoading: isLoadingExcuses } = useExcuses();
  const deleteMutation = useDeleteExcuse();

  const handleCreate = () => {
    setSelectedExcuse(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (excuse: Excuse) => {
    setSelectedExcuse(excuse);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا السجل؟")) {
      deleteMutation.mutate(id);
    }
  };

  const getSoldierName = (soldierId: number) => {
    const soldier = soldiers?.find(s => s.id === soldierId);
    return soldier ? `${soldier.rank} / ${soldier.fullName}` : 'غير معروف';
  };

  const filteredExcuses = useMemo(() => {
    if (!excuses || !soldiers) return [];
    
    return excuses.filter(e => {
      // Filter by type
      if (filterType !== "all" && e.type !== filterType) return false;
      
      // Filter by search term
      const soldier = soldiers.find(s => s.id === e.soldierId);
      if (!soldier) return false;
      
      const searchStr = searchTerm.toLowerCase();
      return (
        soldier.fullName.toLowerCase().includes(searchStr) || 
        soldier.militaryId.toLowerCase().includes(searchStr) ||
        (e.permissionNumber?.toLowerCase() || "").includes(searchStr)
      );
    });
  }, [excuses, soldiers, searchTerm, filterType]);

  const exportToExcel = () => {
    if (!filteredExcuses.length) return;

    const exportData = filteredExcuses.map(e => {
      const soldier = soldiers?.find(s => s.id === e.soldierId);
      return {
        "الرقم العسكري": soldier?.militaryId || '',
        "الرتبة والاسم": soldier ? `${soldier.rank} / ${soldier.fullName}` : '',
        "نوع العذر": e.type,
        "من تاريخ": e.startDate,
        "إلى تاريخ": e.endDate,
        "رقم التصريح": e.permissionNumber || '',
        "جهة الاعتماد": e.approvedBy || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل الأعذار");
    XLSX.writeFile(wb, `سجل_الأعذار_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "إجازة": return "bg-blue-100 text-blue-800 border-blue-300";
      case "مرض": return "bg-purple-100 text-purple-800 border-purple-300";
      case "مهمة": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "سجن": return "bg-slate-800 text-white border-slate-900";
      case "غياب": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isLoading = isLoadingSoldiers || isLoadingExcuses;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">سجل الأعذار والإجازات</h2>
          <p className="text-muted-foreground mt-1">إدارة الإجازات، المرضيات، المهام، والسجن</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="النوع..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {EXCUSE_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input 
            placeholder="بحث بالاسم..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[200px] bg-card"
          />
          
          <Button 
            onClick={exportToExcel} 
            variant="outline" 
            className="border-slate-300 hover:bg-slate-100 hidden md:flex"
            disabled={isLoading || !filteredExcuses.length}
          >
            <Download className="me-2 h-4 w-4" />
            تصدير
          </Button>
          
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Plus className="me-2 h-4 w-4" />
            تسجيل عذر/إجازة
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : !filteredExcuses.length ? (
            <div className="text-center p-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-lg">لا توجد سجلات.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="font-bold">الفرد</TableHead>
                    <TableHead className="font-bold">النوع</TableHead>
                    <TableHead className="font-bold">من تاريخ</TableHead>
                    <TableHead className="font-bold">إلى تاريخ</TableHead>
                    <TableHead className="font-bold">رقم التصريح</TableHead>
                    <TableHead className="w-24 text-center font-bold">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExcuses.map((excuse) => {
                    // Check if current date falls within excuse date range
                    const today = format(new Date(), 'yyyy-MM-dd');
                    const isActive = today >= excuse.startDate && today <= excuse.endDate;
                    
                    return (
                      <TableRow key={excuse.id} className={isActive ? "bg-blue-50/30" : ""}>
                        <TableCell className="font-medium">
                          {getSoldierName(excuse.soldierId)}
                          {isActive && <Badge variant="outline" className="ms-2 border-blue-400 text-blue-700 bg-blue-50 text-[10px]">نشط حالياً</Badge>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-sm font-semibold border ${getTypeColor(excuse.type)}`}>
                            {excuse.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {excuse.startDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {excuse.endDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          {excuse.permissionNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => handleEdit(excuse)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDelete(excuse.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {selectedExcuse ? "تعديل السجل" : "تسجيل عذر/إجازة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <ExcuseForm 
            excuse={selectedExcuse} 
            soldiers={soldiers || []}
            onSuccess={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExcuseForm({ excuse, soldiers, onSuccess }: { excuse?: Excuse, soldiers: Soldier[], onSuccess: () => void }) {
  const createMutation = useCreateExcuse();
  const updateMutation = useUpdateExcuse();
  
  const form = useForm({
    resolver: zodResolver(insertExcuseSchema),
    defaultValues: excuse || {
      soldierId: soldiers[0]?.id || 0,
      type: "إجازة",
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      permissionNumber: "",
      approvedBy: ""
    }
  });

  const onSubmit = (data: any) => {
    if (excuse) {
      updateMutation.mutate({ id: excuse.id, ...data }, { onSuccess });
    } else {
      createMutation.mutate(data, { onSuccess });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="soldierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الفرد</FormLabel>
              <Select 
                onValueChange={(val) => field.onChange(parseInt(val))} 
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفرد..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {soldiers.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.militaryId} - {s.rank} / {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع العذر/الإجازة</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXCUSE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>من تاريخ</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>إلى تاريخ</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="permissionNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رقم التصريح/الأمر (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="رقم المعاملة..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="approvedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>جهة الاعتماد (اختياري)</FormLabel>
              <FormControl>
                <Input placeholder="مثال: قائد الكتيبة..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4 flex justify-end gap-3 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>إلغاء</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isPending}>
            {isPending ? "جاري الحفظ..." : "حفظ السجل"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
