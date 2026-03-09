import { useState } from "react";
import { useReportTemplates } from "@/hooks/use-report-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Code2, Save, X, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { InsertReportTemplate, ReportTemplate } from "@shared/schema";

export default function ReportTemplates() {
  const { data: templates, isPending, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating, isDeleting } = useReportTemplates();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  
  const [formData, setFormData] = useState<Partial<InsertReportTemplate>>({
    name: "",
    description: "",
    htmlContent: "<div>\n  <h1>{{title}}</h1>\n  <p>الرقم العسكري: {{militaryId}}</p>\n  <p>الاسم: {{fullName}}</p>\n</div>",
    cssContent: "div { font-family: Arial, sans-serif; direction: rtl; }",
  });

  const handleOpenEditor = (template?: ReportTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || "",
        htmlContent: template.htmlContent,
        cssContent: template.cssContent || "",
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        htmlContent: "<div class=\"report-container\">\n  <div class=\"header\">\n    <h2>القيادة العامة</h2>\n    <h3>تقرير الأفراد</h3>\n  </div>\n  <div class=\"content\">\n    <p>الاسم: {{fullName}}</p>\n    <p>الرقم العسكري: {{militaryId}}</p>\n    <p>الرتبة: {{rank}}</p>\n  </div>\n</div>",
        cssContent: ".report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; }\n.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }\n.content p { font-size: 14px; line-height: 1.6; }",
      });
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, data: formData });
      } else {
        await createTemplate(formData as InsertReportTemplate);
      }
      setIsEditorOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
      await deleteTemplate(id);
    }
  };

  if (isPending) {
    return <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">قوالب التقارير</h2>
          <p className="text-muted-foreground mt-1">إدارة وتصميم قوالب الطباعة المخصصة</p>
        </div>
        <Button onClick={() => handleOpenEditor()} className="gap-2">
          <Plus className="h-4 w-4" />
          قالب جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                </div>
                {!template.isSystem && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditor(template)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} disabled={isDeleting} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription className="line-clamp-2 mt-2 h-10">
                {template.description || "لا يوجد وصف"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {template.isSystem && (
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium">قالب نظام</span>
                )}
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={() => handleOpenEditor(template)}>
                <Code2 className="h-4 w-4" />
                تعديل التصميم
              </Button>
            </CardContent>
          </Card>
        ))}
        {templates?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد قوالب حالياً. قم بإنشاء قالب جديد للبدء.</p>
          </div>
        )}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Code2 className="h-6 w-6 text-primary" />
              {editingTemplate ? 'تعديل قالب' : 'قالب تقرير جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Editor Sidebar - Form Info */}
            <div className="w-full md:w-1/3 bg-muted/20 border-l p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="space-y-2">
                <Label>اسم القالب</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="مثال: تقرير غياب يومي"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea 
                  value={formData.description || ""} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="وصف مختصر لاستخدام القالب"
                  rows={3}
                />
              </div>
              
              <Card className="border-primary/20 bg-primary/5 mt-4 flex-1">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm">المتغيرات المتاحة</CardTitle>
                  <CardDescription className="text-xs">استخدم هذه المتغيرات داخل كود HTML بين أقواس مزدوجة {'{{متغير}}'}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ScrollArea className="h-32 md:h-64 pr-2">
                    <ul className="text-xs space-y-2 font-mono">
                      <li><code className="bg-background px-1 rounded">{"{{militaryId}}"}</code> الرقم العسكري</li>
                      <li><code className="bg-background px-1 rounded">{"{{fullName}}"}</code> الاسم الكامل</li>
                      <li><code className="bg-background px-1 rounded">{"{{rank}}"}</code> الرتبة</li>
                      <li><code className="bg-background px-1 rounded">{"{{unit}}"}</code> الوحدة</li>
                      <li><code className="bg-background px-1 rounded">{"{{battalion}}"}</code> الكتيبة</li>
                      <li><code className="bg-background px-1 rounded">{"{{specialization}}"}</code> التخصص</li>
                      <li><code className="bg-background px-1 rounded">{"{{status}}"}</code> الحالة</li>
                      <li><code className="bg-background px-1 rounded">{"{{date}}"}</code> التاريخ</li>
                      <li><code className="bg-background px-1 rounded">{"{{currentDate}}"}</code> تاريخ اليوم</li>
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Main Editor Area - Code */}
            <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <Label className="mb-2 font-bold flex items-center gap-2">HTML <span className="text-xs font-normal text-muted-foreground">التصميم والهيكل</span></Label>
                  <Textarea 
                    className="flex-1 font-mono text-left rtl:text-right" 
                    dir="ltr"
                    value={formData.htmlContent}
                    onChange={e => setFormData({...formData, htmlContent: e.target.value})}
                    placeholder="<div>...</div>"
                  />
                </div>
                <div className="flex-1 flex flex-col min-h-[150px]">
                  <Label className="mb-2 font-bold flex items-center gap-2">CSS <span className="text-xs font-normal text-muted-foreground">التنسيق والألوان</span></Label>
                  <Textarea 
                    className="flex-1 font-mono text-left rtl:text-right" 
                    dir="ltr"
                    value={formData.cssContent || ""}
                    onChange={e => setFormData({...formData, cssContent: e.target.value})}
                    placeholder=".class { color: red; }"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/10 mt-auto flex-row justify-between sm:justify-between items-center">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.htmlContent || isCreating || isUpdating} className="gap-2">
              <Save className="h-4 w-4" />
              حفظ القالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
