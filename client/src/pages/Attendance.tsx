import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useSoldiers } from "@/hooks/use-soldiers";
import { useAttendance, useBulkAttendance } from "@/hooks/use-attendance";
import { useExcuses } from "@/hooks/use-excuses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Calendar as CalendarIcon, CheckCircle2, Download, ArrowUpDown, ArrowUp, ArrowDown, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import type { InsertAttendance, Soldier } from "@shared/schema";

const ATTENDANCE_STATUSES = ["حاضر", "غائب", "إجازة", "مهمة", "مريض", "سجن"];

type SortConfig = {
  key: keyof Soldier | 'status' | null;
  direction: 'asc' | 'desc' | null;
};

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceState, setAttendanceState] = useState<Record<number, string>>({});
  const [manualChanges, setManualChanges] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  
  // Fetch active soldiers only
  const { data: soldiers, isLoading: isLoadingSoldiers } = useSoldiers({ archived: "false" });
  
  // Fetch attendance records for the selected date
  const { data: attendance, isLoading: isLoadingAttendance } = useAttendance(selectedDate);

  // Fetch active excuses for the selected date
  const { data: activeExcuses, isLoading: isLoadingExcuses } = useExcuses(undefined, selectedDate);
  
  const bulkSaveMutation = useBulkAttendance();

  // Sync state when data loads OR date changes
  useEffect(() => {
    if (soldiers) {
      const newState: Record<number, string> = {};
      const initialManualChanges = new Set<number>();
      
      soldiers.forEach(soldier => {
        // 1. البحث عن سجل موجود في قاعدة البيانات لهذا التاريخ
        const existingRecord = attendance?.find(a => a.soldierId === soldier.id);
        
        if (existingRecord) {
          newState[soldier.id] = existingRecord.status;
          initialManualChanges.add(soldier.id);
        } else {
          // 2. إذا لم يوجد سجل، نضع الحالة الافتراضية بناءً على الأعذار النشطة ثم الحالة الإدارية
          const activeExcuse = activeExcuses?.find(e => e.soldierId === soldier.id);
          if (activeExcuse) {
             let status = activeExcuse.type;
             // Map excuse type to attendance status if needed
             if (status === "مرض") status = "مريض";
             if (status === "غياب") status = "غائب";
             newState[soldier.id] = status;
          } else if (["إجازة", "مهمة"].includes(soldier.adminStatus)) {
            newState[soldier.id] = soldier.adminStatus;
          } else {
            newState[soldier.id] = "حاضر";
          }
          // ملاحظة: لا نضيفه لـ manualChanges هنا لأنه لم يتم تحضيره يدوياً بعد
        }
      });
      
      setAttendanceState(newState);
      setManualChanges(initialManualChanges);
    }
  }, [soldiers, attendance, activeExcuses, selectedDate]);

  const handleStatusChange = (soldierId: number, status: string) => {
    setAttendanceState(prev => ({ ...prev, [soldierId]: status }));
    setManualChanges(prev => {
      const next = new Set(prev);
      next.add(soldierId);
      return next;
    });
  };

  // الإصلاح الجذري: تحديث الحالة بشكل قسري وتجاوز أي بيانات سابقة
  const handleMarkRemainingAsPresent = () => {
    if (!soldiers) return;
    
    console.log("Executing Force Bulk Update...");
    
    // إنشاء نسخة جديدة تماماً من الحالة الحالية
    const nextState = { ...attendanceState };
    const nextManualChanges = new Set(manualChanges);
    
    let updatedCount = 0;
    soldiers.forEach(soldier => {
      // إذا لم يكن الفرد قد تم تحضيره يدوياً (أو لم يكن له سجل سابق في القاعدة لهذا اليوم)
      if (!nextManualChanges.has(soldier.id)) {
        nextState[soldier.id] = "حاضر";
        nextManualChanges.add(soldier.id);
        updatedCount++;
      }
    });
    
    console.log(`Force updated ${updatedCount} soldiers.`);
    
    // تحديث الحالة بشكل قسري لضمان إعادة الرندرة الفورية
    setAttendanceState(nextState);
    setManualChanges(nextManualChanges);
  };

  const handleSort = (key: keyof Soldier | 'status') => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
      key = null as any;
    }
    setSortConfig({ key, direction });
  };

  const sortedSoldiers = useMemo(() => {
    if (!soldiers) return [];
    let sortableItems = [...soldiers];
    if (sortConfig.key !== null && sortConfig.direction !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'status') {
          aValue = attendanceState[a.id] || "حاضر";
          bValue = attendanceState[b.id] || "حاضر";
        } else {
          aValue = a[sortConfig.key as keyof Soldier] ?? "";
          bValue = b[sortConfig.key as keyof Soldier] ?? "";
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [soldiers, sortConfig, attendanceState]);

  const exportToExcel = () => {
    if (!sortedSoldiers.length) return;

    const exportData = sortedSoldiers.map(soldier => ({
      "الرقم العسكري": soldier.militaryId,
      "الرتبة": soldier.rank,
      "الاسم الكامل": soldier.fullName,
      "الوحدة": soldier.unit,
      "الكتيبة": soldier.battalion,
      "حالة التمام": attendanceState[soldier.id] || "حاضر",
      "التاريخ": selectedDate
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل التمام");
    XLSX.writeFile(wb, `سجل_التمام_${selectedDate}.xlsx`);
  };

  const handleSave = () => {
    if (!soldiers) return;

    const records: InsertAttendance[] = soldiers.map(soldier => ({
      soldierId: soldier.id,
      date: selectedDate,
      status: attendanceState[soldier.id] || "حاضر"
    }));

    bulkSaveMutation.mutate(records, {
      onSuccess: () => {
        // بعد الحفظ الناجح، نعتبر كل التغييرات "محفوظة" (Manual)
        const allIds = new Set(soldiers.map(s => s.id));
        setManualChanges(allIds);
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "حاضر": return "bg-green-100 text-green-800 border-green-300";
      case "غائب": return "bg-red-100 text-red-800 border-red-300";
      case "إجازة": return "bg-blue-100 text-blue-800 border-blue-300";
      case "مهمة": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "مريض": return "bg-purple-100 text-purple-800 border-purple-300";
      case "سجن": return "bg-slate-800 text-white border-slate-900";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getSortIcon = (key: keyof Soldier | 'status') => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ms-2 h-4 w-4 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ms-2 h-4 w-4 text-primary" />;
    return <ArrowDown className="ms-2 h-4 w-4 text-primary" />;
  };

  const isLoading = isLoadingSoldiers || isLoadingAttendance || isLoadingExcuses;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">سجل التمام اليومي</h2>
          <p className="text-muted-foreground mt-1">تسجيل وحفظ حضور وغياب القوة الفاعلة</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={exportToExcel} 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50 h-11 px-6 rounded-xl"
            disabled={isLoading || !sortedSoldiers.length}
          >
            <Download className="me-2 h-5 w-5" />
            تصدير إكسل
          </Button>
          <div className="flex items-center gap-3 bg-card p-2 rounded-xl border shadow-sm">
            <CalendarIcon className="h-5 w-5 text-primary ms-2" />
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none shadow-none h-9 focus-visible:ring-0 w-[150px]"
            />
          </div>
        </div>
      </div>

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b flex flex-col md:flex-row items-center justify-between py-4 gap-4">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            قائمة التمام
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleMarkRemainingAsPresent}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 h-10 px-4 rounded-xl font-bold shadow-sm"
              disabled={isLoading || !soldiers?.length}
            >
              <UserCheck className="me-2 h-5 w-5" />
              تحضير البقية كحاضر
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={bulkSaveMutation.isPending || isLoading || !soldiers?.length}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md h-10 px-6 rounded-xl font-bold"
            >
              <Save className="me-2 h-4 w-4" />
              {bulkSaveMutation.isPending ? "جاري الحفظ..." : "حفظ التمام الكلي"}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : !sortedSoldiers || sortedSoldiers.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <p className="text-lg">لا توجد قوة فاعلة مسجلة في النظام.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="w-16 text-center font-bold">#</TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('militaryId')}
                    >
                      <div className="flex items-center">
                        الرقم العسكري
                        {getSortIcon('militaryId')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('fullName')}
                    >
                      <div className="flex items-center">
                        الرتبة والاسم
                        {getSortIcon('fullName')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('unit')}
                    >
                      <div className="flex items-center">
                        الوحدة / الكتيبة
                        {getSortIcon('unit')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-48 font-bold text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center">
                        حالة التمام
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSoldiers.map((soldier, index) => {
                    const currentStatus = attendanceState[soldier.id] || "حاضر";
                    const isManuallySet = manualChanges.has(soldier.id);
                    
                    // Show if the status is coming from an active excuse
                    const activeExcuse = activeExcuses?.find(e => e.soldierId === soldier.id);
                    const hasActiveExcuse = activeExcuse && !existingRecordForSoldier(attendance, soldier.id) && !isManuallySet;
                    
                    return (
                      <TableRow key={soldier.id} className={`hover:bg-muted/10 transition-colors ${!isManuallySet ? 'bg-yellow-50/50' : ''}`}>
                        <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono">{soldier.militaryId}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{soldier.rank}</span> / {soldier.fullName}
                          {hasActiveExcuse && (
                            <div className="text-xs text-blue-600 mt-1">يوجد عذر نشط ({activeExcuse.type})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {soldier.unit} - {soldier.battalion}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={currentStatus} 
                            onValueChange={(val) => handleStatusChange(soldier.id, val)}
                          >
                            <SelectTrigger className={`h-9 font-semibold ${getStatusColor(currentStatus)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ATTENDANCE_STATUSES.map(status => (
                                <SelectItem key={status} value={status} className="font-semibold">
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
    </div>
  );
}

function existingRecordForSoldier(attendance: any[] | undefined, soldierId: number) {
  return attendance?.some(a => a.soldierId === soldierId);
}

