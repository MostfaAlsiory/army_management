import { useState } from "react";
  import { useQuery, useMutation } from "@tanstack/react-query";
  import { queryClient, apiRequest } from "@/lib/queryClient";
  import type { CustomField, InsertCustomField } from "@shared/schema";
  import { useToast } from "@/hooks/use-toast";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
  import { Switch } from "@/components/ui/switch";
  import { Plus, Edit, Trash2 } from "lucide-react";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import { z } from "zod";

  const ENTITY_TYPES = [
    { value: "soldiers", label: "شؤون الأفراد" },
    { value: "attendance", label: "الحضور والغياب" },
    { value: "violations", label: "المخالفات" },
    { value: "excuses", label: "الأعذار" }
  ];

  const FIELD_TYPES = [
    { value: "text", label: "نص" },
    { value: "number", label: "رقم" },
    { value: "date", label: "تاريخ" },
    { value: "select", label: "قائمة منسدلة" },
    { value: "boolean", label: "نعم/لا" }
  ];

  const formSchema = z.object({
    entityType: z.string().min(1, "مطلوب"),
    name: z.string().min(1, "مطلوب").regex(/^[a-zA-Z0-9_]+$/, "يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطة سفلية فقط"),
    label: z.string().min(1, "مطلوب"),
    type: z.string().min(1, "مطلوب"),
    options: z.any().optional(),
    isRequired: z.boolean().default(false),
    defaultValue: z.string().optional()
  });

  export default function CustomFields() {
    const { toast } = useToast();
    const [selectedEntity, setSelectedEntity] = useState<string>("soldiers");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingField, setEditingField] = useState<CustomField | null>(null);

    const { data: fields, isLoading } = useQuery<CustomField[]>({
      queryKey: ["/api/custom-fields", selectedEntity],
      queryFn: async () => {
        const res = await fetch(`/api/custom-fields?entityType=${selectedEntity}`);
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }
    });

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        entityType: "soldiers",
        name: "",
        label: "",
        type: "text",
        options: [],
        isRequired: false,
        defaultValue: ""
      }
    });

    const [optionsStr, setOptionsStr] = useState("");

    const createMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await apiRequest("POST", "/api/custom-fields", data);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
        toast({ title: "تم إضافة الحقل بنجاح" });
        setIsFormOpen(false);
        form.reset();
      }
    });

    const updateMutation = useMutation({
      mutationFn: async (data: any) => {
        const res = await apiRequest("PATCH", `/api/custom-fields/${data.id}`, data);
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
        toast({ title: "تم تعديل الحقل بنجاح" });
        setIsFormOpen(false);
        setEditingField(null);
        form.reset();
      }
    });

    const deleteMutation = useMutation({
      mutationFn: async (id: number) => {
        await apiRequest("DELETE", `/api/custom-fields/${id}`);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
        toast({ title: "تم حذف الحقل بنجاح" });
      }
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
      const data = { ...values };
      if (data.type === "select") {
        data.options = optionsStr.split(",").map(s => s.trim()).filter(Boolean);
      } else {
        data.options = null;
      }
      
      if (editingField) {
        updateMutation.mutate({ ...data, id: editingField.id });
      } else {
        createMutation.mutate(data);
      }
    };

    const openEdit = (field: CustomField) => {
      setEditingField(field);
      form.reset({
        entityType: field.entityType,
        name: field.name,
        label: field.label,
        type: field.type,
        isRequired: field.isRequired,
        defaultValue: field.defaultValue || ""
      });
      if (field.options && Array.isArray(field.options)) {
        setOptionsStr(field.options.join(", "));
      } else {
        setOptionsStr("");
      }
      setIsFormOpen(true);
    };

    const openNew = () => {
      setEditingField(null);
      form.reset({
        entityType: selectedEntity,
        name: "",
        label: "",
        type: "text",
        isRequired: false,
        defaultValue: ""
      });
      setOptionsStr("");
      setIsFormOpen(true);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-display text-primary">الحقول المخصصة الديناميكية</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="me-2 h-4 w-4"/> إضافة حقل جديد</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingField ? "تعديل حقل" : "إضافة حقل جديد"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="entityType" render={({field}) => (
                    <FormItem>
                      <FormLabel>القسم / الجدول</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({field}) => (
                      <FormItem>
                        <FormLabel>الاسم البرمجي (انجليزي فقط)</FormLabel>
                        <FormControl><Input {...field} disabled={!!editingField} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="label" render={({field}) => (
                      <FormItem>
                        <FormLabel>اسم الحقل (للعرض)</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({field}) => (
                      <FormItem>
                        <FormLabel>نوع الحقل</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="defaultValue" render={({field}) => (
                      <FormItem>
                        <FormLabel>القيمة الافتراضية</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  
                  {form.watch("type") === "select" && (
                    <FormItem>
                      <FormLabel>الخيارات (مفصولة بفاصلة ,)</FormLabel>
                      <FormControl>
                        <Input value={optionsStr} onChange={e => setOptionsStr(e.target.value)} placeholder="خيار1, خيار2, خيار3" />
                      </FormControl>
                    </FormItem>
                  )}

                  <FormField control={form.control} name="isRequired" render={({field}) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">حقل إجباري</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      حفظ الحقل
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="bg-muted/50 border-b border-border pb-4">
            <div className="flex justify-between items-center">
              <CardTitle>إدارة الحقول الإضافية</CardTitle>
              <div className="w-64">
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger><SelectValue placeholder="اختر القسم"/></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الحقل (العرض)</TableHead>
                  <TableHead>الاسم البرمجي</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>إجباري</TableHead>
                  <TableHead>القيمة الافتراضية</TableHead>
                  <TableHead className="text-left">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">جاري التحميل...</TableCell></TableRow>
                ) : fields && fields.length > 0 ? (
                  fields.map(field => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{field.label}</TableCell>
                      <TableCell dir="ltr" className="text-right text-muted-foreground">{field.name}</TableCell>
                      <TableCell>{FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}</TableCell>
                      <TableCell>{field.isRequired ? "نعم" : "لا"}</TableCell>
                      <TableCell>{field.defaultValue || "-"}</TableCell>
                      <TableCell className="text-left">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(field)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                          if(confirm("هل أنت متأكد من حذف هذا الحقل؟")) deleteMutation.mutate(field.id);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد حقول إضافية لهذا القسم</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }
  