import { useSoldiers } from "@/hooks/use-soldiers";
import { useAttendance } from "@/hooks/use-attendance";
import { useNotifications } from "@/hooks/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, ShieldAlert, Activity, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { data: soldiers, isLoading: isLoadingSoldiers } = useSoldiers({ archived: "false" });
  const { generateNotifications, isGenerating } = useNotifications();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: attendance, isLoading: isLoadingAttendance } = useAttendance(today);

  if (isLoadingSoldiers || isLoadingAttendance) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalSoldiers = soldiers?.length || 0;
  const totalAttendanceRecords = attendance?.length || 0;
  
  const presentCount = attendance?.filter(a => a.status === "حاضر").length || 0;
  const absentCount = attendance?.filter(a => a.status === "غائب").length || 0;
  const leaveCount = attendance?.filter(a => a.status === "إجازة").length || 0;
  const missionCount = attendance?.filter(a => a.status === "مهمة").length || 0;
  const sickCount = attendance?.filter(a => a.status === "مريض").length || 0;

  // Unrecorded are those without an attendance record today
  const unrecordedCount = totalSoldiers - totalAttendanceRecords;
  
  // Calculate real present rate (present / total)
  const attendanceRate = totalSoldiers > 0 ? Math.round((presentCount / totalSoldiers) * 100) : 0;

  const pieData = [
    { name: 'حاضر', value: presentCount, color: '#16a34a' },
    { name: 'غائب', value: absentCount, color: '#dc2626' },
    { name: 'إجازة', value: leaveCount, color: '#2563eb' },
    { name: 'مهمة', value: missionCount, color: '#ca8a04' },
    { name: 'مريض', value: sickCount, color: '#9333ea' },
    { name: 'لم يسجل', value: unrecordedCount > 0 ? unrecordedCount : 0, color: '#9ca3af' },
  ].filter(item => item.value > 0);

  // Group by rank
  const rankCounts = soldiers?.reduce((acc, s) => {
    acc[s.rank] = (acc[s.rank] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(rankCounts || {})
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 ranks

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground">لوحة القيادة</h2>
          <p className="text-muted-foreground mt-1">ملخص سريع لحالة الأفراد والانضباط اليومي</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => generateNotifications()} 
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            تحديث الإشعارات
          </Button>
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold border border-primary/20">
            تاريخ اليوم: {format(new Date(), 'yyyy/MM/dd')}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate border-r-4 border-r-primary">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي الأفراد</p>
              <h3 className="text-3xl font-bold text-foreground">{totalSoldiers}</h3>
            </div>
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate border-r-4 border-r-green-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">نسبة الحضور</p>
              <h3 className="text-3xl font-bold text-green-600">{attendanceRate}%</h3>
            </div>
            <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate border-r-4 border-r-red-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">عدد الغياب</p>
              <h3 className="text-3xl font-bold text-red-600">{absentCount}</h3>
            </div>
            <div className="h-12 w-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate border-r-4 border-r-blue-500">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">في مهمة / إجازة</p>
              <h3 className="text-3xl font-bold text-blue-600">{missionCount + leaveCount}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-600">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-display">موقف الحضور اليومي</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'العدد']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'Cairo' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'Cairo', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg font-display">توزيع الأفراد حسب الرتبة (أعلى 8)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full" dir="ltr"> {/* Recharts works better with ltr, but labels are Arabic */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                  <XAxis dataKey="rank" tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'Cairo' }} />
                  <YAxis tick={{ fill: '#64748b', fontFamily: 'Cairo' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    formatter={(value: number) => [value, 'العدد']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
