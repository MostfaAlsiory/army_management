import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSoldierSchema, type InsertSoldier, type Soldier } from "@shared/schema";
import { useCreateSoldier, useUpdateSoldier } from "@/hooks/use-soldiers";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, User, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const RANKS = [
  "جندي", "جندي أول", "عريف", "وكيل رقيب", "رقيب", "رقيب أول", "رئيس رقباء",
  "ملازم", "ملازم أول", "نقيب", "رائد", "مقدم", "عقيد", "عميد", "لواء"
];

const STATUSES = ["على رأس العمل", "إجازة", "مهمة", "موقوف"];
const MARITAL_STATUSES = ["أعزب", "متزوج", "مطلق", "أرمل"];
const HEALTH_STATUSES = ["لائق طبياً", "غير لائق", "إصابة عمل", "مريض"];

interface SoldierFormProps {
  soldier?: Soldier;
  onSuccess: () => void;
}

export function SoldierForm({ soldier, onSuccess }: SoldierFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(soldier?.photoPath || null);

  const createMutation = useCreateSoldier();
  const updateMutation = useUpdateSoldier();
  const { data: customFields } = useCustomFields("soldiers");

  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues: Partial<InsertSoldier> = soldier ? {
    militaryId: soldier.militaryId,
    fullName: soldier.fullName,
    birthDate: soldier.birthDate,
    birthPlace: soldier.birthPlace,
    nationalId: soldier.nationalId,
    rank: soldier.rank,
    specialization: soldier.specialization,
    unit: soldier.unit,
    battalion: soldier.battalion,
    joinDate: soldier.joinDate,
    adminStatus: soldier.adminStatus,
    healthStatus: soldier.healthStatus,
    maritalStatus: soldier.maritalStatus,
    phoneNumber: soldier.phoneNumber,
    address: soldier.address,
    closestRelative: soldier.closestRelative,
    photoPath: soldier.photoPath,
    dynamicFields: soldier.dynamicFields || {},
  } : {
    militaryId: "",
    fullName: "",
    birthDate: "",
    birthPlace: "",
    nationalId: "",
    rank: "",
    specialization: "",
    unit: "",
    battalion: "",
    joinDate: format(new Date(), 'yyyy-MM-dd'),
    adminStatus: "على رأس العمل",
    healthStatus: "لائق طبياً",
    maritalStatus: "أعزب",
    phoneNumber: "",
    address: "",
    closestRelative: "",
    photoPath: null,
    dynamicFields: {},
  };

  const form = useForm<InsertSoldier>({
    resolver: zodResolver(insertSoldierSchema),
    defaultValues,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("/api/soldiers/upload-photo", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      form.setValue("photoPath", data.tempPath);
      setPhotoPreview(URL.createObjectURL(file));
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (error) {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    form.setValue("photoPath", null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  function onSubmit(data: InsertSoldier) {
    if (soldier) {
      updateMutation.mutate({ id: soldier.id, ...data }, {
        onSuccess: () => onSuccess()
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => onSuccess()
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center mb-6 space-y-4">
          <div className="relative h-32 w-32 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center bg-muted/30 overflow-hidden group">
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                <button 
                  type="button"
                  onClick={removePhoto}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="text-white h-6 w-6" />
                </button>
              </>
            ) : (
              <User className="h-16 w-16 text-muted-foreground/50" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="me-2 h-4 w-4" />
            {photoPreview ? "تغيير الصورة" : "رفع صورة شخصية"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg border-b pb-2 text-primary">البيانات الشخصية</h3>
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم الرباعي</FormLabel>
                <FormControl><Input {...field} placeholder="الاسم الكامل" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nationalId" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهوية الوطنية</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="militaryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>الرقم العسكري</FormLabel>
                  <FormControl><Input {...field} dir="ltr" className="text-right" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الميلاد</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="birthPlace" render={({ field }) => (
                <FormItem>
                  <FormLabel>مكان الميلاد</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة الاجتماعية</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="healthStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة الصحية</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {HEALTH_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg border-b pb-2 text-primary">البيانات العسكرية</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="rank" render={({ field }) => (
                <FormItem>
                  <FormLabel>الرتبة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر الرتبة" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RANKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="specialization" render={({ field }) => (
                <FormItem>
                  <FormLabel>التخصص العسكري</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="battalion" render={({ field }) => (
                <FormItem>
                  <FormLabel>الكتيبة</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>الوحدة / السرية</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="joinDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الالتحاق</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="adminStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة الإدارية</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 space-y-4">
            <h3 className="font-display font-bold text-lg border-b pb-2 text-primary">معلومات التواصل</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl><Input {...field} dir="ltr" className="text-right" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="closestRelative" render={({ field }) => (
                <FormItem>
                  <FormLabel>أقرب قريب (للتواصل)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>عنوان السكن</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>
        
          {customFields && customFields.length > 0 && (
            <div className="col-span-1 md:col-span-2 space-y-4">
              <h3 className="font-display font-bold text-lg border-b pb-2 text-primary">حقول إضافية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    
        <div className="flex justify-end pt-4 border-t gap-3">
          <Button type="submit" disabled={isPending || uploading} className="min-w-32 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all">
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {soldier ? "حفظ التعديلات" : "إضافة فرد جديد"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
