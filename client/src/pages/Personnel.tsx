import { useState, useMemo } from "react";
import { useSoldiers, useUpdateSoldier } from "@/hooks/use-soldiers";
import { SoldierForm } from "@/components/SoldierForm";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  UserPlus, 
  Edit, 
  Archive, 
  ArchiveRestore,
  Filter,
  Phone,
  User,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import * as XLSX from 'xlsx';
import type { Soldier } from "@shared/schema";

type SortConfig = {
  key: keyof Soldier | null;
  direction: 'asc' | 'desc' | null;
};

export default function Personnel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | undefined>();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  const { data: soldiers, isLoading } = useSoldiers({ 
    search: searchTerm || undefined, 
    archived: showArchived ? "true" : "false" 
  });

  const updateSoldier = useUpdateSoldier();

  const handleSort = (key: keyof Soldier) => {
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
        const aValue = a[sortConfig.key!] ?? "";
        const bValue = b[sortConfig.key!] ?? "";
        
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
  }, [soldiers, sortConfig]);

  const exportToExcel = () => {
    if (!sortedSoldiers.length) return;

    const exportData = sortedSoldiers.map(soldier => ({
      "الرقم العسكري": soldier.militaryId,
      "الاسم الكامل": soldier.fullName,
      "الرتبة": soldier.rank,
      "التخصص": soldier.specialization,
      "الوحدة": soldier.unit,
      "الكتيبة": soldier.battalion,
      "رقم الهاتف": soldier.phoneNumber,
      "الحالة الإدارية": soldier.adminStatus,
      "مؤرشف": soldier.archived ? "نعم" : "لا"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قائمة الأفراد");
    XLSX.writeFile(wb, `قائمة_الأفراد_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleEdit = (soldier: Soldier) => {
    setSelectedSoldier(soldier);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedSoldier(undefined);
    setIsFormOpen(true);
  };

  const handleToggleArchive = (soldier: Soldier) => {
    if (confirm(soldier.archived ? "هل أنت متأكد من استعادة هذا الفرد للخدمة؟" : "هل أنت متأكد من أرشفة (طي قيد) هذا الفرد؟")) {
      updateSoldier.mutate({
        id: soldier.id,
        archived: !soldier.archived
      });
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const getSortIcon = (key: keyof Soldier) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ms-2 h-4 w-4 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ms-2 h-4 w-4 text-primary" />;
    return <ArrowDown className="ms-2 h-4 w-4 text-primary" />;
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">شؤون الأفراد</h2>
          <p className="text-muted-foreground mt-1">إدارة بيانات الأفراد، الإضافة، التعديل والأرشفة</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={exportToExcel} 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50 h-11 px-6 rounded-xl"
            disabled={isLoading || !sortedSoldiers.length}
          >
            <Download className="me-2 h-5 w-5" />
            تصدير إكسل
          </Button>
          <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all h-11 px-6 rounded-xl">
            <UserPlus className="me-2 h-5 w-5" />
            إضافة فرد جديد
          </Button>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث بالرقم العسكري أو الاسم..." 
                className="pl-4 pr-10 h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant={showArchived ? "secondary" : "outline"} 
                onClick={() => setShowArchived(!showArchived)}
                className="h-11 rounded-xl"
              >
                <Filter className="me-2 h-4 w-4" />
                {showArchived ? "عرض القوة الفاعلة فقط" : "عرض الأرشيف"}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : !sortedSoldiers || sortedSoldiers.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground flex flex-col items-center">
              <User className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg">لا يوجد أفراد مطابقين للبحث</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-16"></TableHead>
                    <TableHead 
                      className="font-bold text-right text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('militaryId')}
                    >
                      <div className="flex items-center">
                        الرقم العسكري
                        {getSortIcon('militaryId')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-right text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('fullName')}
                    >
                      <div className="flex items-center">
                        الرتبة والاسم
                        {getSortIcon('fullName')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-right text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('unit')}
                    >
                      <div className="flex items-center">
                        الوحدة
                        {getSortIcon('unit')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-right text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort('adminStatus')}
                    >
                      <div className="flex items-center">
                        الحالة الإدارية
                        {getSortIcon('adminStatus')}
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-center text-foreground">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSoldiers.map((soldier) => (
                    <TableRow key={soldier.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <Avatar className="h-10 w-10 border border-primary/20">
                          {soldier.photoPath ? (
                            <AvatarImage src={soldier.photoPath} alt={soldier.fullName} />
                          ) : (
                            <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                          )}
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-mono text-sm tracking-widest">{soldier.militaryId}</TableCell>
                      <TableCell>
                        <div className="font-bold text-foreground">{soldier.fullName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{soldier.rank} | {soldier.specialization}</div>
                      </TableCell>
                      <TableCell>
                        <div>{soldier.unit}</div>
                        <div className="text-xs text-muted-foreground">{soldier.battalion}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                          ${soldier.adminStatus === 'على رأس العمل' ? 'bg-green-500/10 text-green-600 border-green-200' : ''}
                          ${soldier.adminStatus === 'إجازة' ? 'bg-blue-500/10 text-blue-600 border-blue-200' : ''}
                          ${soldier.adminStatus === 'مهمة' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' : ''}
                          ${soldier.adminStatus === 'موقوف' ? 'bg-red-500/10 text-red-600 border-red-200' : ''}
                        `}>
                          {soldier.adminStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleCall(soldier.phoneNumber)}
                            title="اتصال"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEdit(soldier)}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={`h-8 w-8 ${soldier.archived ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                            onClick={() => handleToggleArchive(soldier)}
                            title={soldier.archived ? "استعادة" : "أرشفة"}
                          >
                            {soldier.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-2xl font-display text-primary flex items-center gap-2">
              {selectedSoldier ? <Edit className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
              {selectedSoldier ? "تعديل بيانات الفرد" : "تسجيل فرد جديد"}
            </DialogTitle>
          </DialogHeader>
          
          <SoldierForm 
            soldier={selectedSoldier} 
            onSuccess={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
