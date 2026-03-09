import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DatabaseBackup, Download, Trash2, RotateCcw, Save, Settings2, Clock, Filter, Search, X } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

interface Backup {
  filename: string;
  createdAt: string;
  size: number;
  type: string;
  backupType?: 'full' | 'incremental';
  description?: string;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  intervalHours: number;
}

export default function Backups() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'full' | 'incremental'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'size' | 'name'>('date');
  const [backupTypeToCreate, setBackupTypeToCreate] = useState<'full' | 'incremental'>('full');
  const [searchText, setSearchText] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');

  // Queries
  const { data: backups = [], isLoading: loadingBackups } = useQuery<Backup[]>({
    queryKey: ['/api/backups', filterType, sortBy, searchText, fromDate, toDate, minSize, maxSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      params.append('sortBy', sortBy);
      if (searchText) params.append('search', searchText);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (minSize) params.append('minSize', minSize);
      if (maxSize) params.append('maxSize', maxSize);
      const response = await fetch(`/api/backups?${params}`);
      return response.json();
    }
  });

  const { data: settings, isLoading: loadingSettings } = useQuery<BackupSettings>({
    queryKey: ['/api/backups/settings'],
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/backups', { backupType: backupTypeToCreate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
      toast({
        title: "تم بنجاح",
        description: `تم إنشاء نسخة احتياطية ${backupTypeToCreate === 'incremental' ? 'جزئية' : 'كاملة'}`,
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (filename: string) => {
      await apiRequest('DELETE', `/api/backups/${filename}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backups'] });
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
      toast({
        title: "تم بنجاح",
        description: "تم حذف النسخة الاحتياطية",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (filename: string) => {
      await apiRequest('POST', `/api/backups/${filename}/restore`, undefined);
    },
    onSuccess: () => {
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      toast({
        title: "تم بنجاح",
        description: "تم استعادة النظام من النسخة الاحتياطية",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في استعادة النظام",
        variant: "destructive",
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: BackupSettings) => {
      await apiRequest('POST', '/api/backups/settings', newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/backups/settings'] });
      toast({
        title: "تم بنجاح",
        description: "تم حفظ إعدادات النسخ الاحتياطي التلقائي",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    }
  });

  // Settings State
  const [localSettings, setLocalSettings] = useState<BackupSettings>({
    autoBackupEnabled: false,
    intervalHours: 24,
  });

  // Effect to sync settings
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);


  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(localSettings);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">النسخ الاحتياطي</h2>
          <p className="text-muted-foreground mt-1">إدارة النسخ الاحتياطية للنظام وقواعد البيانات</p>
        </div>
        <Dialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء نسخة احتياطية جديدة</DialogTitle>
              <DialogDescription>
                اختر نوع النسخة الاحتياطية التي تريد إنشاءها
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="backup-type">نوع النسخة الاحتياطية</Label>
                <Select value={backupTypeToCreate} onValueChange={(v: any) => setBackupTypeToCreate(v)}>
                  <SelectTrigger id="backup-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">نسخة كاملة (Full Backup)</SelectItem>
                    <SelectItem value="incremental">نسخة جزئية (Incremental Backup)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {backupTypeToCreate === 'incremental' 
                  ? 'تحفظ فقط التعديلات منذ آخر نسخة احتياطية' 
                  : 'تحفظ قاعدة البيانات بالكامل'}
              </p>
            </div>
            <DialogFooter>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={createMutation.isPending}
                className="bg-primary hover:bg-primary/90 w-full"
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseBackup className="mr-2 h-4 w-4" />
                )}
                إنشاء النسخة
              </Button>
            </DialogFooter>
          </DialogContent>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <DatabaseBackup className="mr-2 h-4 w-4" />
              إنشاء نسخة جديدة
            </Button>
          </DialogTrigger>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-primary/10 shadow-sm">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center text-lg">
              <Settings2 className="w-5 h-5 ml-2 text-primary" />
              إعدادات النسخ التلقائي
            </CardTitle>
            <CardDescription>قم بتكوين أوقات النسخ الاحتياطي التلقائي</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {loadingSettings ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-backup" className="text-base cursor-pointer">تفعيل النسخ التلقائي</Label>
                  <Switch
                    id="auto-backup"
                    checked={localSettings.autoBackupEnabled}
                    onCheckedChange={(checked) => setLocalSettings({ ...localSettings, autoBackupEnabled: checked })}
                  />
                </div>
                
                {localSettings.autoBackupEnabled && (
                  <div className="space-y-3 pt-2">
                    <Label htmlFor="interval">تكرار النسخ (بالساعات)</Label>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        id="interval"
                        type="number"
                        min="1"
                        max="720"
                        value={localSettings.intervalHours}
                        onChange={(e) => setLocalSettings({ ...localSettings, intervalHours: parseInt(e.target.value) || 24 })}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      سيقوم النظام بأخذ نسخة احتياطية كل {localSettings.intervalHours} ساعة.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleSaveSettings} 
                  disabled={updateSettingsMutation.isPending}
                  className="w-full mt-4"
                  variant="outline"
                >
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  حفظ الإعدادات
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-primary/10 shadow-sm">
          <CardHeader className="bg-muted/30 pb-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center text-lg">
                  <DatabaseBackup className="w-5 h-5 ml-2 text-primary" />
                  سجل النسخ الاحتياطية
                </CardTitle>
                <CardDescription>قائمة بجميع النسخ الاحتياطية المتوفرة</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل النسخ</SelectItem>
                    <SelectItem value="full">النسخ الكاملة</SelectItem>
                    <SelectItem value="incremental">النسخ الجزئية</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 ml-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">الأحدث أولاً</SelectItem>
                    <SelectItem value="size">الأكبر أولاً</SelectItem>
                    <SelectItem value="name">الأبجدية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن نسخة احتياطية..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pe-10"
                />
              </div>
              <Button 
                variant={showAdvancedSearch ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <Filter className="h-4 w-4" />
                متقدم
              </Button>
            </div>

            {/* Advanced Search */}
            {showAdvancedSearch && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">من التاريخ</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">إلى التاريخ</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الحد الأدنى (MB)</Label>
                  <Input
                    type="number"
                    value={minSize}
                    onChange={(e) => setMinSize(e.target.value ? String(parseInt(e.target.value) * 1024 * 1024) : '')}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الحد الأقصى (MB)</Label>
                  <Input
                    type="number"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value ? String(parseInt(e.target.value) * 1024 * 1024) : '')}
                    placeholder="∞"
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Active Filters Info */}
            {(searchText || fromDate || toDate || minSize || maxSize) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>عدد النسخ: {backups.length}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSearchText('');
                    setFromDate('');
                    setToDate('');
                    setMinSize('');
                    setMaxSize('');
                  }}
                  className="h-auto p-0 text-primary hover:text-primary/80"
                >
                  <X className="h-4 w-4" />
                  مسح الفلاتر
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loadingBackups ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <DatabaseBackup className="h-12 w-12 mb-4 opacity-20" />
                <p>لا توجد نسخ احتياطية حالياً</p>
                <p className="text-sm mt-1">قم بإنشاء نسخة احتياطية يدوية أو فعل النسخ التلقائي</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>اسم الملف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>نوع النسخة</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead>الحجم</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.filename} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-sm max-w-[150px] truncate" title={backup.filename}>
                          {backup.filename}
                        </TableCell>
                        <TableCell>
                          <Badge variant={backup.type === 'يدوي' ? 'default' : 'secondary'} className="font-normal">
                            {backup.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={backup.backupType === 'full' ? 'outline' : 'secondary'} className="font-normal">
                            {backup.backupType === 'full' ? 'كاملة' : 'جزئية'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm" dir="ltr">
                          {format(new Date(backup.createdAt), 'yyyy/MM/dd HH:mm', { locale: arSA })}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap" dir="ltr">
                          {formatSize(backup.size)}
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              title="استعادة"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedBackup(backup.filename);
                                setRestoreDialogOpen(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="حذف"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedBackup(backup.filename);
                                setDeleteDialogOpen(true);
                              }}
                            >
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
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              حذف النسخة الاحتياطية
            </DialogTitle>
            <DialogDescription className="pt-2">
              هل أنت متأكد من رغبتك في حذف النسخة الاحتياطية التالية؟ لا يمكن التراجع عن هذا الإجراء.
              <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono text-left break-all text-foreground" dir="ltr">
                {selectedBackup}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedBackup && deleteMutation.mutate(selectedBackup)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              استعادة النظام
            </DialogTitle>
            <DialogDescription className="pt-2">
              <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  <strong>تحذير هام:</strong> سيتم استبدال جميع البيانات الحالية في النظام بالبيانات الموجودة في هذه النسخة الاحتياطية. أي تغييرات تمت بعد تاريخ هذه النسخة سيتم فقدانها.
                </div>
                <div>
                  هل أنت متأكد من رغبتك في استعادة النظام من النسخة التالية؟
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono text-left break-all text-foreground" dir="ltr">
                    {selectedBackup}
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => selectedBackup && restoreMutation.mutate(selectedBackup)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              تأكيد الاستعادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
