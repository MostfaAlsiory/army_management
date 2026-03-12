import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useAttendance } from "@/hooks/use-attendance";
import { useSoldiers } from "@/hooks/use-soldiers";
import { useViolations } from "@/hooks/use-violations";
import { useExcuses } from "@/hooks/use-excuses";
import { useReportTemplates } from "@/hooks/use-report-templates";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Filter, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import type { Soldier, Attendance, Violation, Excuse, ReportTemplate } from "@shared/schema";

type SortConfig = {
  key: string | null;
  direction: 'asc' | 'desc' | null;
};

type ReportType = 'attendance' | 'excuses' | 'violations' | 'comprehensive' | 'individual_data' | 'unit_personnel' | 'human_power' | 'personnel_distribution' | 'promotion_eligible' | 'daily_movement' | 'presence_status' | 'general_statistics' | 'monthly_leadership_report' | 'quarterly_readiness_report';

const REPORT_TYPES = [
    { value: 'individual_data', label: 'تقرير بيانات الفرد' },
    { value: 'unit_personnel', label: 'كشف أفراد الوحدة' },
    { value: 'human_power', label: 'تقرير القوة البشرية' },
    { value: 'attendance', label: 'تقرير الحضور والغياب' },
    { value: 'excuses', label: 'تقرير الإجازات' },
    { value: 'personnel_distribution', label: 'تقرير توزيع الأفراد' },
    { value: 'promotion_eligible', label: 'تقرير المستحقين للترقية' },
    { value: 'daily_movement', label: 'تقرير الحركة اليومية' },
    { value: 'presence_status', label: 'تقرير حالات التواجد' },
    { value: 'general_statistics', label: 'تقرير الإحصائيات العامة' },
    { value: 'violations', label: 'تقرير المخالفات والجزاءات' },
    { value: 'monthly_leadership_report', label: 'التقرير الشهري المرفوع للقيادة' },
    { value: 'quarterly_readiness_report', label: 'تقرير الجاهزية الربع سنوي' },
    { value: 'comprehensive', label: 'التقرير الشامل (عام)' },
  ];

const EXCUSE_TYPE_OPTIONS = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'إجازة', label: 'إجازة' },
  { value: 'مرض', label: 'مرض' },
  { value: 'مهمة', label: 'مهمة' },
  { value: 'سجن', label: 'سجن' },
  { value: 'غياب', label: 'غياب' },
];

const COMPREHENSIVE_FIELDS = [
  { id: "militaryId", label: "الرقم العسكري" },
  { id: "fullName", label: "الاسم الكامل" },
  { id: "rank", label: "الرتبة" },
  { id: "unit", label: "الوحدة" },
  { id: "battalion", label: "الكتيبة" },
  { id: "presentCount", label: "الحاضر" },
  { id: "absentCount", label: "الغائب" },
  { id: "onLeaveCount", label: "إجازة" },
  { id: "onTaskCount", label: "مهمة" },
  { id: "sickCount", label: "مريض" },
  { id: "imprisonedCount", label: "سجن" },
  { id: "totalViolations", label: "المخالفات" },
  { id: "activeExcuse", label: "العذر النشط" },
];

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('attendance');
  const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [excuseTypeFilter, setExcuseTypeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [searchTerm, setSearchTerm] = useState<string>("");
    const [unitFilter, setUnitFilter] = useState<string>("all");
    const [battalionFilter, setBattalionFilter] = useState<string>("all");
    const [rankFilter, setRankFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Column customization for attendance
  const [selectedAttendanceFields, setSelectedAttendanceFields] = useState<string[]>([
    "militaryId", "fullName", "rank", "unit", "status", "date"
  ]);

  // Column customization for comprehensive report
  const [selectedComprehensiveFields, setSelectedComprehensiveFields] = useState<string[]>([
    "militaryId", "fullName", "rank", "unit", "presentCount", "absentCount", "onLeaveCount", "totalViolations"
  ]);

  const { data: soldiers, isLoading: loadingSoldiers } = useSoldiers({ archived: "false" });
  const { data: attendanceData, isLoading: loadingAttendance } = useAttendance(undefined, fromDate, toDate);
  const { data: violations, isLoading: loadingViolations } = useViolations();
  const { data: excuses, isLoading: loadingExcuses } = useExcuses();
  const { data: templates, isLoading: loadingTemplates } = useReportTemplates();
  const { data: soldierCustomFields } = useCustomFields("soldiers");
  const { data: violationCustomFields } = useCustomFields("violations");
  const { data: excuseCustomFields } = useCustomFields("excuses");
  const { data: attendanceCustomFields } = useCustomFields("attendance");

  // Determine which custom fields apply to the current report type
  const activeCustomFields = useMemo(() => {
    switch (reportType) {
      case 'violations': return violationCustomFields || [];
      case 'excuses': return excuseCustomFields || [];
      case 'attendance': return attendanceCustomFields || [];
      default: return soldierCustomFields || [];
    }
  }, [reportType, soldierCustomFields, violationCustomFields, excuseCustomFields, attendanceCustomFields]);

  const fieldValueToString = (val: any, type: string) => {
    if (val === undefined || val === null) return "-";
    if (type === "boolean") return val ? "نعم" : "لا";
    return String(val);
  };

    const uniqueUnits = useMemo(() => {
      if (!soldiers) return [];
      return Array.from(new Set(soldiers.map(s => s.unit).filter(Boolean)));
    }, [soldiers]);

    const uniqueBattalions = useMemo(() => {
      if (!soldiers) return [];
      return Array.from(new Set(soldiers.map(s => s.battalion).filter(Boolean)));
    }, [soldiers]);

    const uniqueRanks = useMemo(() => {
      if (!soldiers) return [];
      return Array.from(new Set(soldiers.map(s => s.rank).filter(Boolean)));
    }, [soldiers]);

    // General Filter Function
    const applyGeneralFilters = (soldier: any) => {
      if (!soldier) return false;
      if (unitFilter !== 'all' && soldier.unit !== unitFilter) return false;
      if (battalionFilter !== 'all' && soldier.battalion !== battalionFilter) return false;
      if (rankFilter !== 'all' && soldier.rank !== rankFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!soldier.fullName?.toLowerCase().includes(search) && !soldier.militaryId?.toLowerCase().includes(search)) return false;
      }
      return true;
    };
  

  const attendanceFields = [
    { id: "militaryId", label: "الرقم العسكري" },
    { id: "fullName", label: "الاسم" },
    { id: "rank", label: "الرتبة" },
    { id: "unit", label: "الوحدة" },
    { id: "status", label: "الحالة" },
    { id: "date", label: "التاريخ" },
    { id: "phoneNumber", label: "رقم الهاتف" },
    { id: "specialization", label: "التخصص" },
  ];

  const toggleAttendanceField = (id: string) => {
    setSelectedAttendanceFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleComprehensiveField = (id: string) => {
    setSelectedComprehensiveFields(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
      key = null as any;
    }
    setSortConfig({ key, direction });
  };

  // Attendance Report Data
  const attendanceReportData = useMemo(() => {
      if (!attendanceData || !soldiers) return [];
      return attendanceData
        .map(record => {
          const soldier = soldiers.find(s => s.id === record.soldierId);
          const soldierAttendance = attendanceData.filter(a => a.soldierId === soldier?.id) || [];
          const soldierExcuses = excuses?.filter(e => e.soldierId === soldier?.id) || [];
          const soldierViolations = violations?.filter(v => v.soldierId === soldier?.id) || [];
          
          return {
            ...record,
            ...soldier,
            dynamicFields: record.dynamicFields || {},
            soldierDynamicFields: soldier?.dynamicFields || {},
            militaryId: soldier?.militaryId || "",
            fullName: soldier?.fullName || "",
            rank: soldier?.rank || "",
            unit: soldier?.unit || "",
            battalion: soldier?.battalion || "",
            phoneNumber: soldier?.phoneNumber || "",
            specialization: soldier?.specialization || "",
            // Attendance aggregates
            attendanceCount: soldierAttendance.length,
            presentCount: soldierAttendance.filter(a => a.status === 'حاضر').length,
            absentCount: soldierAttendance.filter(a => a.status === 'غائب').length,
            // Excuses aggregates
            excusesCount: soldierExcuses.length,
            leaveCount: soldierExcuses.filter(e => e.type === 'إجازة').length,
            sickCount: soldierExcuses.filter(e => e.type === 'مرض').length,
            imprisonmentCount: soldierExcuses.filter(e => e.type === 'سجن').length,
            // Violations aggregates
            violationsCount: soldierViolations.length,
            _soldier: soldier,
            _attendance: soldierAttendance,
            _excuses: soldierExcuses,
            _violations: soldierViolations
          };
        })
        .filter(r => applyGeneralFilters(r._soldier))
        .sort((a, b) => {
          if (!sortConfig.key || !sortConfig.direction) return 0;
          const aVal = (a as any)[sortConfig.key!] ?? "";
          const bVal = (b as any)[sortConfig.key!] ?? "";
          return sortConfig.direction === 'asc' 
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
    }, [attendanceData, soldiers, sortConfig, searchTerm, unitFilter, battalionFilter, rankFilter, excuses, violations]);

  // Excuses Report Data - Enriched with soldier and related data
  const excusesReportData = useMemo(() => {
      if (!excuses || !soldiers) return [];
      const filtered = excuses
        .filter(e => {
          if (e.startDate > toDate || e.endDate < fromDate) return false;
          if (excuseTypeFilter !== 'all' && e.type !== excuseTypeFilter) return false;
          return true;
        })
        .map(excuse => {
          const soldier = soldiers.find(s => s.id === excuse.soldierId);
          const soldierAttendance = attendanceData?.filter(a => a.soldierId === soldier?.id) || [];
          const soldierExcuses = excuses.filter(e => e.soldierId === soldier?.id);
          const soldierViolations = violations?.filter(v => v.soldierId === soldier?.id) || [];
          
          return {
            ...excuse,
            ...soldier,
            dynamicFields: excuse.dynamicFields || {},
            soldierDynamicFields: soldier?.dynamicFields || {},
            militaryId: soldier?.militaryId || "",
            fullName: soldier?.fullName || "",
            rank: soldier?.rank || "",
            unit: soldier?.unit || "",
            battalion: soldier?.battalion || "",
            // Attendance data
            attendanceCount: soldierAttendance.length,
            presentCount: soldierAttendance.filter(a => a.status === 'حاضر').length,
            absentCount: soldierAttendance.filter(a => a.status === 'غائب').length,
            // Excuses data
            excusesCount: soldierExcuses.length,
            leaveCount: soldierExcuses.filter(e => e.type === 'إجازة').length,
            sickCount: soldierExcuses.filter(e => e.type === 'مرض').length,
            imprisonmentCount: soldierExcuses.filter(e => e.type === 'سجن').length,
            // Violations data
            violationsCount: soldierViolations.length,
            _soldier: soldier,
            _attendance: soldierAttendance,
            _excuses: soldierExcuses,
            _violations: soldierViolations
          };
        })
        .filter(r => applyGeneralFilters(r._soldier));

      if (sortConfig.key && sortConfig.direction) {
        filtered.sort((a, b) => {
          const aVal = (a as any)[sortConfig.key!] ?? "";
          const bVal = (b as any)[sortConfig.key!] ?? "";
          return sortConfig.direction === 'asc' 
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
      }
      return filtered;
    }, [excuses, soldiers, fromDate, toDate, excuseTypeFilter, sortConfig, searchTerm, unitFilter, battalionFilter, rankFilter, attendanceData, violations]);

  // Violations Report Data - Enriched with soldier and related data
  const violationsReportData = useMemo(() => {
      if (!violations || !soldiers) return [];
      const filtered = violations
        .filter(v => v.date >= fromDate && v.date <= toDate)
        .map(violation => {
          const soldier = soldiers.find(s => s.id === violation.soldierId);
          const soldierAttendance = attendanceData?.filter(a => a.soldierId === soldier?.id) || [];
          const soldierExcuses = excuses?.filter(e => e.soldierId === soldier?.id) || [];
          const soldierViolations = violations.filter(v => v.soldierId === soldier?.id);
          
          return {
            ...violation,
            ...soldier,
            dynamicFields: violation.dynamicFields || {},
            soldierDynamicFields: soldier?.dynamicFields || {},
            militaryId: soldier?.militaryId || "",
            fullName: soldier?.fullName || "",
            rank: soldier?.rank || "",
            unit: soldier?.unit || "",
            battalion: soldier?.battalion || "",
            // Attendance data
            attendanceCount: soldierAttendance.length,
            presentCount: soldierAttendance.filter(a => a.status === 'حاضر').length,
            absentCount: soldierAttendance.filter(a => a.status === 'غائب').length,
            // Excuses data
            excusesCount: soldierExcuses.length,
            leaveCount: soldierExcuses.filter(e => e.type === 'إجازة').length,
            sickCount: soldierExcuses.filter(e => e.type === 'مرض').length,
            imprisonmentCount: soldierExcuses.filter(e => e.type === 'سجن').length,
            // Violations data
            violationsCount: soldierViolations.length,
            _soldier: soldier,
            _attendance: soldierAttendance,
            _excuses: soldierExcuses,
            _violations: soldierViolations
          };
        })
        .filter(r => applyGeneralFilters(r._soldier));

      if (sortConfig.key && sortConfig.direction) {
        filtered.sort((a, b) => {
          const aVal = (a as any)[sortConfig.key!] ?? "";
          const bVal = (b as any)[sortConfig.key!] ?? "";
          return sortConfig.direction === 'asc' 
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
      }
      return filtered;
    }, [violations, soldiers, fromDate, toDate, sortConfig, searchTerm, unitFilter, battalionFilter, rankFilter, attendanceData, excuses]);

  // Comprehensive Report Data (Soldier Summary) - Fully enriched with all related data
  const comprehensiveReportData = useMemo(() => {
      if (!soldiers || !attendanceData || !excuses || !violations) return [];
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      return soldiers
        .filter(s => !s.archived && applyGeneralFilters(s))
        .map(soldier => {
          const soldierAttendance = attendanceData.filter(a => a.soldierId === soldier.id);
          const soldierAttendanceFiltered = attendanceData.filter(a => a.soldierId === soldier.id && a.date >= fromDate && a.date <= toDate);
          const presentCount = soldierAttendanceFiltered.filter(a => a.status === 'حاضر').length;
          const absentCount = soldierAttendanceFiltered.filter(a => a.status === 'غائب').length;
          const onLeaveCount = soldierAttendanceFiltered.filter(a => a.status === 'إجازة').length;
          const onTaskCount = soldierAttendanceFiltered.filter(a => a.status === 'مهمة').length;
          const sickCount = soldierAttendanceFiltered.filter(a => a.status === 'مريض').length;
          const imprisonedCount = soldierAttendanceFiltered.filter(a => a.status === 'سجن').length;

          const soldierExcuses = excuses.filter(e => e.soldierId === soldier.id && e.startDate <= toDate && e.endDate >= fromDate);
          const soldierExcusesAll = excuses.filter(e => e.soldierId === soldier.id);
          const soldierLeaves = soldierExcuses.filter(e => e.type === 'إجازة');
          const soldierSickness = soldierExcuses.filter(e => e.type === 'مرض');
          const soldierImprisoned = soldierExcuses.filter(e => e.type === 'سجن');

          const soldierViolations = violations.filter(v => v.soldierId === soldier.id && v.date >= fromDate && v.date <= toDate);
          const soldierViolationsAll = violations.filter(v => v.soldierId === soldier.id);
          const activeExcuseToday = soldierExcuses.find(e => e.startDate <= today && e.endDate >= today);

          return {
            ...soldier,
            militaryId: soldier.militaryId,
            fullName: soldier.fullName,
            rank: soldier.rank,
            unit: soldier.unit,
            battalion: soldier.battalion,
            presentCount,
            absentCount,
            onLeaveCount,
            onTaskCount,
            sickCount,
            imprisonedCount,
            totalLeaveRecords: soldierLeaves.length,
            totalSicknessRecords: soldierSickness.length,
            totalImprisonmentRecords: soldierImprisoned.length,
            totalViolations: soldierViolations.length,
            activeExcuse: activeExcuseToday?.type || '-',
            // Full counts (all time)
            attendanceCount: soldierAttendance.length,
            excusesCount: soldierExcusesAll.length,
            leaveCount: soldierExcusesAll.filter(e => e.type === 'إجازة').length,
            violationsCount: soldierViolationsAll.length,
            // Data arrays for template access
            _attendance: soldierAttendance,
            _excuses: soldierExcusesAll,
            _violations: soldierViolationsAll
          };
        });
    }, [soldiers, attendanceData, excuses, violations, fromDate, toDate, searchTerm, unitFilter, battalionFilter, rankFilter]);
    
    // Added new report data - Enriched with related records from all tables
    const newReportsData = useMemo(() => {
      if (!soldiers) return [];
      return soldiers.filter(s => !s.archived && applyGeneralFilters(s)).map(soldier => {
        const soldierAttendance = attendanceData?.filter(a => a.soldierId === soldier.id) || [];
        const soldierExcuses = excuses?.filter(e => e.soldierId === soldier.id) || [];
        const soldierViolations = violations?.filter(v => v.soldierId === soldier.id) || [];
        
        return {
          ...soldier,
          // Attendance aggregates
          attendanceCount: soldierAttendance.length,
          presentCount: soldierAttendance.filter(a => a.status === 'حاضر').length,
          absentCount: soldierAttendance.filter(a => a.status === 'غائب').length,
          // Excuses aggregates
          excusesCount: soldierExcuses.length,
          leaveCount: soldierExcuses.filter(e => e.type === 'إجازة').length,
          sickCount: soldierExcuses.filter(e => e.type === 'مرض').length,
          imprisonmentCount: soldierExcuses.filter(e => e.type === 'سجن').length,
          // Violations aggregates
          violationsCount: soldierViolations.length,
          _attendance: soldierAttendance,
          _excuses: soldierExcuses,
          _violations: soldierViolations
        };
      });
    }, [soldiers, unitFilter, battalionFilter, rankFilter, searchTerm, attendanceData, excuses, violations]);
    
    const dailyMovementData = useMemo(() => {
      if (!soldiers || !attendanceData) return [];
      const todayStr = toDate; // Using toDate as target date for movement
      
      return soldiers.filter(s => !s.archived && applyGeneralFilters(s)).map(soldier => {
        const todayAtt = attendanceData.find(a => a.soldierId === soldier.id && a.date === todayStr);
        const soldierAttendance = attendanceData.filter(a => a.soldierId === soldier.id) || [];
        const soldierExcuses = excuses?.filter(e => e.soldierId === soldier.id) || [];
        const soldierViolations = violations?.filter(v => v.soldierId === soldier.id) || [];
        
        return {
          ...soldier,
          status: todayAtt ? todayAtt.status : 'غير مسجل',
          // Attendance aggregates
          attendanceCount: soldierAttendance.length,
          presentCount: soldierAttendance.filter(a => a.status === 'حاضر').length,
          absentCount: soldierAttendance.filter(a => a.status === 'غائب').length,
          // Excuses aggregates
          excusesCount: soldierExcuses.length,
          leaveCount: soldierExcuses.filter(e => e.type === 'إجازة').length,
          sickCount: soldierExcuses.filter(e => e.type === 'مرض').length,
          imprisonmentCount: soldierExcuses.filter(e => e.type === 'سجن').length,
          // Violations aggregates
          violationsCount: soldierViolations.length,
          _attendance: soldierAttendance,
          _excuses: soldierExcuses,
          _violations: soldierViolations
        };
      });
    }, [soldiers, attendanceData, toDate, unitFilter, battalionFilter, rankFilter, searchTerm, excuses, violations]);
    

  const getReportData = () => {
      switch (reportType) {
        case 'attendance': return attendanceReportData;
        case 'excuses': return excusesReportData;
        case 'violations': return violationsReportData;
        case 'comprehensive': return comprehensiveReportData;
        case 'daily_movement': return dailyMovementData;
        case 'monthly_leadership_report':
        case 'quarterly_readiness_report':
        case 'individual_data':
        case 'unit_personnel':
        case 'human_power':
        case 'personnel_distribution':
        case 'promotion_eligible':
        case 'presence_status':
        case 'general_statistics':
           return newReportsData;
        default: return [];
      }
    };

  const getReportColumns = () => {
      switch (reportType) {
        case 'attendance': return selectedAttendanceFields;
        case 'excuses': return ['militaryId', 'fullName', 'rank', 'unit', 'type', 'startDate', 'endDate', 'permissionNumber', 'approvedBy'];
        case 'violations': return ['militaryId', 'fullName', 'rank', 'unit', 'date', 'reason', 'punishment', 'notes'];
        case 'comprehensive': return selectedComprehensiveFields;
        case 'individual_data': return ['militaryId', 'fullName', 'rank', 'unit', 'battalion', 'birthDate', 'nationalId', 'specialization', 'joinDate', 'adminStatus', 'healthStatus', 'maritalStatus', 'phoneNumber', 'address'];
        case 'unit_personnel': return ['militaryId', 'fullName', 'rank', 'unit', 'battalion', 'specialization', 'adminStatus'];
        case 'human_power': return ['unit', 'battalion', 'rank', 'fullName', 'militaryId', 'specialization'];
        case 'personnel_distribution': return ['unit', 'battalion', 'specialization', 'fullName', 'rank'];
        case 'promotion_eligible': return ['militaryId', 'fullName', 'rank', 'unit', 'lastPromotionDate', 'nextPromotionDate'];
        case 'daily_movement': return ['militaryId', 'fullName', 'rank', 'unit', 'status'];
        case 'monthly_leadership_report': return ['militaryId', 'fullName', 'rank', 'unit', 'presentCount', 'absentCount', 'onLeaveCount', 'totalViolations'];
        case 'quarterly_readiness_report': return ['militaryId', 'fullName', 'rank', 'unit', 'adminStatus', 'healthStatus', 'specialization'];
        case 'presence_status': return ['militaryId', 'fullName', 'rank', 'unit', 'adminStatus', 'healthStatus'];
        case 'general_statistics': return ['unit', 'battalion', 'rank'];
        default: return [];
      }
    };

  const getColumnLabel = (columnId: string): string => {
      const labels: Record<string, string> = {
        militaryId: 'الرقم العسكري',
        fullName: 'الاسم الكامل',
        rank: 'الرتبة',
        unit: 'الوحدة',
        battalion: 'الكتيبة',
        status: 'الحالة',
        date: 'التاريخ',
        phoneNumber: 'رقم الهاتف',
        specialization: 'التخصص',
        type: 'النوع',
        startDate: 'من تاريخ',
        endDate: 'إلى تاريخ',
        permissionNumber: 'رقم التصريح',
        approvedBy: 'جهة الاعتماد',
        reason: 'السبب',
        punishment: 'العقوبة',
        notes: 'ملاحظات',
        presentCount: 'الحاضر',
        absentCount: 'الغائب',
        onLeaveCount: 'إجازة',
        onTaskCount: 'مهمة',
        sickCount: 'مريض',
        imprisonedCount: 'سجن',
        totalLeaveRecords: 'إجازات',
        totalSicknessRecords: 'أمراض',
        totalImprisonmentRecords: 'سجن',
        totalViolations: 'المخالفات',
        activeExcuse: 'العذر النشط',
        birthDate: 'تاريخ الميلاد',
        nationalId: 'الهوية الوطنية',
        joinDate: 'تاريخ الالتحاق',
        adminStatus: 'الحالة الإدارية',
        healthStatus: 'الحالة الصحية',
        maritalStatus: 'الحالة الاجتماعية',
        address: 'العنوان',
        lastPromotionDate: 'تاريخ آخر ترقية',
        nextPromotionDate: 'تاريخ الترقية القادمة',
        // Aggregated fields
        attendanceCount: 'عدد السجلات الحضور',
        excusesCount: 'عدد الأعذار',
        leaveCount: 'عدد الإجازات',
        imprisonmentCount: 'عدد حالات السجن',
        violationsCount: 'عدد المخالفات',
        // Additional soldier fields
        birthPlace: 'مكان الميلاد',
        closestRelative: 'أقرب الأقارب',
        photoPath: 'صورة',
      };
    return labels[columnId] || columnId;
  };

  const exportToExcel = () => {
    const data = getReportData();
    if (!data.length) return;

    const columns = getReportColumns();
    const exportData = data.map(record => {
      const row: any = {};
      columns.forEach(col => {
        row[getColumnLabel(col)] = (record as any)[col];
      });
      // Add custom fields to export
      activeCustomFields.forEach(cf => {
        row[cf.label] = fieldValueToString((record as any).dynamicFields?.[cf.name], cf.type);
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const reportName = REPORT_TYPES.find(rt => rt.value === reportType)?.label || 'تقرير';
    XLSX.utils.book_append_sheet(wb, ws, reportName.substring(0, 31));
    const fileName = `${reportName}_${fromDate}_إلى_${toDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ms-2 h-4 w-4 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ms-2 h-4 w-4 text-primary" />;
    return <ArrowDown className="ms-2 h-4 w-4 text-primary" />;
  };

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'تقرير',
  });

  // Helper function to safely access nested data
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, prop) => {
      if (current == null) return '-';
      return current[prop];
    }, obj);
  };

  // Helper function to format value for display
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val.toString();
    if (Array.isArray(val)) return val.length.toString(); // Return array length
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const getReportHtml = () => {
    if (!selectedTemplate || !templates) return null;
    const template = templates.find(t => t.id === parseInt(selectedTemplate));
    if (!template) return null;

    const columns = getReportColumns();
    const data = getReportData();

    return data.map((record, index) => {
      let html = template.htmlContent;
      const safeRecord = record as any;

      // Find all {{variable}} or {{table.field}} patterns in template
      const variablePattern = /\{\{([^}]+)\}\}/g;
      let match;
      const replacements = new Map<string, string>();

      while ((match = variablePattern.exec(template.htmlContent)) !== null) {
        const fullVariable = match[1].trim();
        
        // Check if it's a special field like currentDate
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

        // Try direct field access first (soldier fields or calculated aggregates)
        if (safeRecord.hasOwnProperty(fullVariable)) {
          replacements.set(fullVariable, formatValue(safeRecord[fullVariable]));
          continue;
        }

        // Try nested access for related table data
        // Support patterns like: attendance.0.status, excuses.0.type, violations.0.reason
        if (fullVariable.includes('.')) {
          const val = getNestedValue(safeRecord, fullVariable);
          replacements.set(fullVariable, formatValue(val));
          continue;
        }

        // Try to get from related data arrays with common access patterns
        // For attendance: attendanceCount, presentCount, etc.
        if (fullVariable.includes('attendance') || fullVariable.includes('Attendance')) {
          const val = safeRecord[fullVariable];
          if (val !== undefined) {
            replacements.set(fullVariable, formatValue(val));
          }
          continue;
        }

        // For excuses: excusesCount, leaveCount, etc.
        if (fullVariable.includes('excuse') || fullVariable.includes('Excuse') || 
            fullVariable.includes('leave') || fullVariable.includes('sick') ||
            fullVariable.includes('imprisonment') || fullVariable.includes('Imprisonment')) {
          const val = safeRecord[fullVariable];
          if (val !== undefined) {
            replacements.set(fullVariable, formatValue(val));
          }
          continue;
        }

        // For violations: violationsCount, etc.
        if (fullVariable.includes('violation') || fullVariable.includes('Violation')) {
          const val = safeRecord[fullVariable];
          if (val !== undefined) {
            replacements.set(fullVariable, formatValue(val));
          }
          continue;
        }

        // Default: try to get from record
        const val = safeRecord[fullVariable];
        replacements.set(fullVariable, formatValue(val));
      }

      // Apply all replacements
      replacements.forEach((value, key) => {
        const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
        html = html.replace(regex, value);
      });

      return (
        <div key={index} className="report-page" style={{ pageBreakAfter: 'always' }} dangerouslySetInnerHTML={{ __html: `<style>${template.cssContent}</style>${html}` }} />
      );
    });
  };

  const isLoading = loadingSoldiers || loadingAttendance || loadingViolations || loadingExcuses || loadingTemplates;
  const reportData = getReportData();
  const reportColumns = getReportColumns();

  return (
    <div className="space-y-6 fade-in">
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          {getReportHtml()}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">التقارير الشاملة</h2>
          <p className="text-muted-foreground mt-1">إنشاء واستخراج التقارير المختلفة بصيغ مخصصة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handlePrint()} disabled={isLoading || !reportData.length || !selectedTemplate} className="bg-blue-600 hover:bg-blue-700 h-11 px-6">
            <Printer className="me-2 h-5 w-5" />
            طباعة
          </Button>
          <Button onClick={exportToExcel} disabled={isLoading || !reportData.length} className="bg-green-600 hover:bg-green-700 h-11 px-6">
            <Download className="me-2 h-5 w-5" />
            تصدير إلى إكسل
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Filters */}
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              خيارات التقرير
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">قالب الطباعة</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="اختر القالب (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map(t => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">نوع التقرير</Label>
              <Select value={reportType} onValueChange={(val) => {
                setReportType(val as ReportType);
                setSortConfig({ key: null, direction: null });
                setSearchTerm("");
              }}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">الفترة الزمنية</Label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">من تاريخ:</span>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-card" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">إلى تاريخ:</span>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-card" />
                </div>
              </div>
            </div>

            {/* Excuse Type Filter */}
            {reportType === 'excuses' && (
              <div className="space-y-3">
                <Label className="text-sm font-bold">نوع العذر</Label>
                <Select value={excuseTypeFilter} onValueChange={setExcuseTypeFilter}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXCUSE_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Attendance Fields Customization */}
            {reportType === 'attendance' && (
              <div className="space-y-3">
                <Label className="text-sm font-bold">الحقول المطلوبة</Label>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {attendanceFields.map(field => (
                    <div key={field.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox 
                        id={`field-${field.id}`} 
                        checked={selectedAttendanceFields.includes(field.id)} 
                        onCheckedChange={() => toggleAttendanceField(field.id)}
                      />
                      <label htmlFor={`field-${field.id}`} className="text-xs leading-none cursor-pointer">
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comprehensive Fields Customization */}
            {reportType === 'comprehensive' && (
              <div className="space-y-3">
                <Label className="text-sm font-bold">الحقول المطلوبة</Label>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {COMPREHENSIVE_FIELDS.map(field => (
                    <div key={field.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox 
                        id={`comp-field-${field.id}`} 
                        checked={selectedComprehensiveFields.includes(field.id)} 
                        onCheckedChange={() => toggleComprehensiveField(field.id)}
                      />
                      <label htmlFor={`comp-field-${field.id}`} className="text-xs leading-none cursor-pointer">
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-bold">الوحدة</Label>
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {uniqueUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold">الكتيبة</Label>
                <Select value={battalionFilter} onValueChange={setBattalionFilter}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {uniqueBattalions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-bold">الرتبة</Label>
                <Select value={rankFilter} onValueChange={setRankFilter}>
                  <SelectTrigger className="bg-card"><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {uniqueRanks.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Search */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">بحث</Label>
              <Input 
                placeholder="ابحث بالاسم أو الرقم العسكري..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-card text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Content - Report Preview */}
        <Card className="lg:col-span-3 shadow-md overflow-hidden">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-primary" />
              {REPORT_TYPES.find(rt => rt.value === reportType)?.label || 'معاينة التقرير'}
              <span className="text-sm font-normal text-muted-foreground ms-auto">({reportData.length} سجل)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center p-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : !reportData || reportData.length === 0 ? (
              <div className="text-center p-16 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد بيانات للفترة والفلاتر المحددة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      {reportColumns.map(colId => (
                        <TableHead 
                          key={colId} 
                          className="font-bold text-foreground cursor-pointer hover:bg-muted/50 transition-colors text-center"
                          onClick={() => handleSort(colId)}
                        >
                          <div className="flex items-center justify-center">
                            {getColumnLabel(colId)}
                            {getSortIcon(colId)}
                          </div>
                        </TableHead>
                      ))}
                      {activeCustomFields.map(cf => (
                        <TableHead
                          key={`cf-${cf.id}`}
                          className="font-bold text-center text-purple-700 bg-purple-50/60 cursor-pointer hover:bg-purple-100/60 transition-colors"
                          onClick={() => handleSort(`dynamicFields.${cf.name}`)}
                        >
                          <div className="flex items-center justify-center">
                            {cf.label}
                            {getSortIcon(`dynamicFields.${cf.name}`)}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((record, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/10">
                        {reportColumns.map(colId => {
                          const value = (record as any)[colId];
                          let displayValue = value || '-';
                          
                          // Format specific columns
                          if (colId.includes('Count') && typeof value === 'number') {
                            displayValue = value.toString();
                          }
                          
                          return (
                            <TableCell key={colId} className="text-center text-sm">
                              {displayValue}
                            </TableCell>
                          );
                        })}
                        {activeCustomFields.map(cf => (
                          <TableCell key={`cf-${cf.id}`} className="text-center text-sm">
                            {fieldValueToString((record as any).dynamicFields?.[cf.name], cf.type)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
