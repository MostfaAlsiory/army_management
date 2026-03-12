import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useAttendance } from "@/hooks/use-attendance";
import { useSoldiers } from "@/hooks/use-soldiers";
import { useViolations } from "@/hooks/use-violations";
import { useExcuses } from "@/hooks/use-excuses";
import { useReportTemplates } from "@/hooks/use-report-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, Printer, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import type { ReportTemplate } from "@shared/schema";

type AggregationType = 'by_unit' | 'by_battalion' | 'overall';

interface AggregatedData {
  groupName: string;
  totalSoldiers: number;
  totalPresent: number;
  totalAbsent: number;
  totalOnLeave: number;
  totalOnTask: number;
  totalSick: number;
  totalImprisoned: number;
  totalViolations: number;
  totalExcuses: number;
  leaveCount: number;
  sickCount: number;
  imprisonmentCount: number;
  attendanceRate: string;
}

export default function AggregatedReports() {
  const [aggregationType, setAggregationType] = useState<AggregationType>('by_unit');
  const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: soldiers, isLoading: loadingSoldiers } = useSoldiers({ archived: "false" });
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendance(undefined, fromDate, toDate);
  const { data: violations, isLoading: loadingViolations } = useViolations();
  const { data: excuses, isLoading: loadingExcuses } = useExcuses();
  const { data: templates, isLoading: loadingTemplates } = useReportTemplates();

  const aggregatedData = useMemo(() => {
    if (!soldiers || !attendanceData || !violations || !excuses) return [];

    const groupedData: Map<string, AggregatedData> = new Map();

    soldiers.forEach((soldier) => {
      const key = aggregationType === 'by_unit' 
        ? soldier.unit || 'غير محدد'
        : aggregationType === 'by_battalion'
        ? soldier.battalion || 'غير محدد'
        : 'الكل';

      // Filter data by date range ONLY
      const soldierAttendance = attendanceData.filter(a => 
        a.soldierId === soldier.id && a.date >= fromDate && a.date <= toDate
      );
      const soldierViolations = violations.filter(v => 
        v.soldierId === soldier.id && v.date >= fromDate && v.date <= toDate
      );
      const soldierExcuses = excuses.filter(e => 
        e.soldierId === soldier.id && e.startDate <= toDate && e.endDate >= fromDate
      );

      const presentCount = soldierAttendance.filter(a => a.status === 'حاضر').length;
      const absentCount = soldierAttendance.filter(a => a.status === 'غائب').length;
      const onLeaveCount = soldierAttendance.filter(a => a.status === 'إجازة').length;
      const onTaskCount = soldierAttendance.filter(a => a.status === 'مهمة').length;
      const sickCount = soldierAttendance.filter(a => a.status === 'مريض').length;
      const imprisonedCount = soldierAttendance.filter(a => a.status === 'سجن').length;

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          groupName: key,
          totalSoldiers: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalOnLeave: 0,
          totalOnTask: 0,
          totalSick: 0,
          totalImprisoned: 0,
          totalViolations: 0,
          totalExcuses: 0,
          leaveCount: 0,
          sickCount: 0,
          imprisonmentCount: 0,
          attendanceRate: '0%'
        });
      }

      const current = groupedData.get(key)!;
      current.totalSoldiers++;
      current.totalPresent += presentCount;
      current.totalAbsent += absentCount;
      current.totalOnLeave += onLeaveCount;
      current.totalOnTask += onTaskCount;
      current.totalSick += sickCount;
      current.totalImprisoned += imprisonedCount;
      current.totalViolations += soldierViolations.length;
      current.totalExcuses += soldierExcuses.length;
      current.leaveCount += soldierExcuses.filter(e => e.type === 'إجازة').length;
      current.sickCount += soldierExcuses.filter(e => e.type === 'مرض').length;
      current.imprisonmentCount += soldierExcuses.filter(e => e.type === 'سجن').length;

      const totalAttendance = soldierAttendance.length;
      if (totalAttendance > 0) {
        current.attendanceRate = ((presentCount / totalAttendance) * 100).toFixed(1) + '%';
      }
    });

    return Array.from(groupedData.values());
  }, [soldiers, attendanceData, violations, excuses, aggregationType]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const getAggregatedHtml = (data: AggregatedData) => {
    const template = templates?.find(t => t.id === parseInt(selectedTemplate));
    if (!template) return '';

    let html = template.htmlContent;
    const replacements = new Map<string, string>();

    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = variablePattern.exec(template.htmlContent)) !== null) {
      const fullVariable = match[1].trim();

      if (fullVariable === 'currentDate') {
        replacements.set(fullVariable, format(new Date(), 'yyyy-MM-dd'));
        continue;
      }
      if (fullVariable === 'fromDate') {
        replacements.set(fullVariable, fromDate);
        continue;
      }
      if (fullVariable === 'toDate') {
        replacements.set(fullVariable, toDate);
        continue;
      }

      if (fullVariable === 'groupName') {
        replacements.set(fullVariable, data.groupName);
        continue;
      }

      const fieldValue = (data as any)[fullVariable];
      if (fieldValue !== undefined) {
        replacements.set(fullVariable, String(fieldValue));
      }
    }

    replacements.forEach((value, key) => {
      const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      html = html.replace(regex, value);
    });

    return `<style>${template.cssContent || ""}</style>${html}`;
  };

  const exportToExcel = () => {
    const data = aggregatedData;
    if (!data.length) return;

    const exportData = data.map(record => ({
      'المجموعة': record.groupName,
      'إجمالي الأفراد': record.totalSoldiers,
      'الحاضرون': record.totalPresent,
      'الغائبون': record.totalAbsent,
      'الإجازات': record.totalOnLeave,
      'المهمات': record.totalOnTask,
      'المرضى': record.totalSick,
      'المسجونون': record.totalImprisoned,
      'المخالفات': record.totalViolations,
      'الأعذار': record.totalExcuses,
      'نسبة الحضور': record.attendanceRate
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير الإحصائي');
    const fileName = `تقرير_احصائي_${fromDate}_إلى_${toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const isLoading = loadingSoldiers || loadingAttendance || loadingViolations || loadingExcuses || loadingTemplates;

  return (
    <div className="space-y-6 fade-in">
      <div style={{ display: "none" }}>
        <div ref={printRef} className="bg-white p-8">
          {aggregatedData.map((data, index) => (
            <div key={index} className="report-page" style={{ pageBreakAfter: 'always', marginBottom: '40px' }}>
              <div dangerouslySetInnerHTML={{ __html: getAggregatedHtml(data) }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            التقارير الإحصائية
          </h2>
          <p className="text-muted-foreground mt-1">تقارير مجمعة على مستوى الوحدات والكتائب</p>
        </div>
      </div>

      <Card className="bg-muted/30 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">المعاملات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>نوع التجميع</Label>
              <Select value={aggregationType} onValueChange={(v) => setAggregationType(v as AggregationType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="by_unit">حسب الوحدة</SelectItem>
                  <SelectItem value="by_battalion">حسب الكتيبة</SelectItem>
                  <SelectItem value="overall">إجمالي عام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>قالب الطباعة</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قالب..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={exportToExcel} disabled={isLoading || !aggregatedData.length} className="bg-green-600 hover:bg-green-700">
              <Download className="me-2 h-4 w-4" />
              تصدير إلى إكسل
            </Button>
            <Button onClick={() => handlePrint()} disabled={isLoading || !aggregatedData.length || !selectedTemplate} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="me-2 h-4 w-4" />
              طباعة
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="flex justify-center p-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>}

      {!isLoading && aggregatedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>البيانات الإحصائية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المجموعة</TableHead>
                    <TableHead className="text-right">إجمالي الأفراد</TableHead>
                    <TableHead className="text-right">الحاضرون</TableHead>
                    <TableHead className="text-right">الغائبون</TableHead>
                    <TableHead className="text-right">الإجازات</TableHead>
                    <TableHead className="text-right">المخالفات</TableHead>
                    <TableHead className="text-right">الأعذار</TableHead>
                    <TableHead className="text-right">نسبة الحضور</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-bold">{row.groupName}</TableCell>
                      <TableCell>{row.totalSoldiers}</TableCell>
                      <TableCell className="text-green-600">{row.totalPresent}</TableCell>
                      <TableCell className="text-red-600">{row.totalAbsent}</TableCell>
                      <TableCell className="text-blue-600">{row.totalOnLeave}</TableCell>
                      <TableCell className="text-orange-600">{row.totalViolations}</TableCell>
                      <TableCell>{row.totalExcuses}</TableCell>
                      <TableCell className="font-semibold">{row.attendanceRate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && aggregatedData.length === 0 && (
        <Card className="text-center py-12 text-muted-foreground">
          <p>لا توجد بيانات متاحة</p>
        </Card>
      )}
    </div>
  );
}
