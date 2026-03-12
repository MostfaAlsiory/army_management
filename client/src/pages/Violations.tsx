import { useState, useMemo } from "react";
import { useSoldiers } from "@/hooks/use-soldiers";
import { useViolations, useCreateViolation, useUpdateViolation, useDeleteViolation } from "@/hooks/use-violations";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertOctagon, Plus, Edit, Trash2, Calendar as CalendarIcon, UserCheck, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertViolationSchema, type Violation, type Soldier } from "@shared/schema";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import * as XLSX from 'xlsx';

const fieldValueToString = (val: any, type: string) => {
    if (val === undefined || val === null) return "-";
    if (type === "boolean") return val ? "نعم" : "لا";
    return String(val);
  };

  export default function Violations() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: soldiers, isLoading: isLoadingSoldiers } = useSoldiers({ archived: "false" });
  const { data: violations, isLoading: isLoadingViolations } = useViolations();
  const deleteMutation = useDeleteViolation();
  const { data: customFields } = useCustomFields("violations");

  const handleCreate = () => {
    setSelectedViolation(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (violation: Violation) => {
    setSelectedViolation(violation);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه المخالفة؟")) {
      deleteMutation.mutate(id);
    }
  };

  const getSoldierName = (soldierId: number) => {
    const soldier = soldiers?.find(s => s.id === soldierId);
    return soldier ? `${soldier.rank} / ${soldier.fullName}` : 'غير معروف';
  };

  const filteredViolations = useMemo(() => {
    if (!violations || !soldiers) return [];
    
    return violations.filter(v => {
      const soldier = soldiers.find(s => s.id === v.soldierId);
      if (!soldier) return false;
      
      const searchStr = searchTerm.toLowerCase();
      return (
        soldier.fullName.toLowerCase().includes(searchStr) || 
        soldier.militaryId.toLowerCase().includes(searchStr) ||
        v.reason.toLowerCase().includes(searchStr)
      );
    });
  }, [violations, soldiers, searchTerm]);

  const exportToExcel = () => {
    if (!filteredViolations.length) return;

    const exportData = filteredViolations.map(v => {
      const soldier = soldiers?.find(s => s.id === v.soldierId);
      return {
        "الرقم العسكري": soldier?.militaryId || '',
        "الرتبة والاسم": soldier ? `${soldier.rank} / ${soldier.fullName}` : '',
        "تاريخ المخالفة": v.date,
        "سبب المخالفة": v.reason,
        "العقوبة/الجزاء": v.punishment,
        "ملاحظات": v.notes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المخالفات");
    XLSX.writeFile(wb, `سجل_المخالفات_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const isLoading = isLoadingSoldiers || isLoadingViolations;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">سجل المخالفات والجزاءات</h2>
          <p className="text-muted-foreground mt-1">إدارة مخالفات الأفراد وتوثيق العقوبات</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Input 
            placeholder="بحث بالاسم، الرقم العسكري أو المخالفة..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-[250px] bg-card"
          />
          <Button 
            onClick={exportToExcel} 
            variant="outline" 
            className="border-slate-300 hover:bg-slate-100 hidden sm:flex"
            disabled={isLoading || !filteredViolations.length}
          >
            <Download className="me-2 h-4 w-4" />
            تصدير
          </Button>
          <Button onClick={handleCreate} className="bg-red-700 hover:bg-red-800 text-white font-bold">
            <Plus className="me-2 h-4 w-4" />
            تسجيل مخالفة
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : !filteredViolations.length ? (
            <div className="text-center p-12 text-muted-foreground">
              <AlertOctagon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-lg">لا توجد مخالفات مسجلة.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-red-50/50">
                  <TableRow>
                    <TableHead className="font-bold">الفرد</TableHead>
                    <TableHead className="font-bold">تاريخ المخالفة</TableHead>
                    <TableHead className="font-bold">السبب</TableHead>
                    <TableHead className="font-bold">العقوبة الموقعة</TableHead>
                    {customFields?.map(cf => (
                      <TableHead key={cf.id} className="font-bold text-center text-purple-700 bg-purple-50/60">
                        {cf.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-center font-bold">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredViolations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell className="font-medium">
                        {getSoldierName(violation.soldierId)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {violation.date}
                        </div>
                      </TableCell>
                      <TableCell>{violation.reason}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-sm font-semibold text-red-800 border border-red-200">
                          {violation.punishment}
                        </span>
                      </TableCell>
                      {customFields?.map(cf => (
                        <TableCell key={cf.id} className="text-center text-sm">
                          {fieldValueToString((violation.dynamicFields as any)?.[cf.name], cf.type)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => handleEdit(violation)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDelete(violation.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-red-700">
              <AlertOctagon className="h-5 w-5" />
              {selectedViolation ? "تعديل مخالفة" : "تسجيل مخالفة جديدة"}
            </DialogTitle>
          </DialogHeader>
          <ViolationForm 
            violation={selectedViolation} 
            soldiers={soldiers || []}
            onSuccess={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ViolationForm({ violation, soldiers, onSuccess }: { violation?: Violation, soldiers: Soldier[], onSuccess: () => void }) {
  const createMutation = useCreateViolation();
  const updateMutation = useUpdateViolation();
  const { data: customFields } = useCustomFields("violations");
  
  const form = useForm({
    resolver: zodResolver(insertViolationSchema),
    defaultValues: violation || {
      soldierId: soldiers[0]?.id || 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      reason: "",
      punishment: "",
      notes: "",
      dynamicFields: {}
    }
  });

  const onSubmit = (data: any) => {
    if (violation) {
      updateMutation.mutate({ id: violation.id, ...data }, { onSuccess });
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
              <FormLabel>الفرد المخالف</FormLabel>
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تاريخ المخالفة</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>سبب المخالفة</FormLabel>
              <FormControl>
                <Input placeholder="مثال: التأخر عن التمام، الغياب بدون عذر..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="punishment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>العقوبة الموقعة (الجزاء)</FormLabel>
              <FormControl>
                <Input placeholder="مثال: سجن 3 أيام، حسم راتب..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
              <FormControl>
                <Textarea placeholder="أي تفاصيل أخرى..." {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {customFields && customFields.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-bold text-sm text-primary">حقول إضافية</h3>
            <div className="grid grid-cols-1 gap-4">
              {customFields.map((field) => (
                <FormField 
                  key={field.id}
                  control={form.control} 
                  name={`dynamicFields.${field.name}` as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field.label} {field.isRequired && <span className="text-red-500">*</span>}</FormLabel>
                      {field.type === "text" && <FormControl><Input {...formField} value={formField.value || field.defaultValue || ""} /></FormControl>}
                      {field.type === "number" && <FormControl><Input type="number" {...formField} value={formField.value || field.defaultValue || ""} /></FormControl>}
                      {field.type === "date" && <FormControl><Input type="date" {...formField} value={formField.value || field.defaultValue || ""} /></FormControl>}
                      {field.type === "select" && (
                        <Select onValueChange={formField.onChange} defaultValue={formField.value || field.defaultValue}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Array.isArray(field.options) && field.options.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {field.type === "boolean" && (
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Switch checked={!!formField.value} onCheckedChange={formField.onChange} />
                          </div>
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>إلغاء</Button>
          <Button type="submit" className="bg-red-700 hover:bg-red-800" disabled={isPending}>
            {isPending ? "جاري الحفظ..." : "حفظ المخالفة"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
