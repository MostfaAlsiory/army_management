
  import { db } from "./server/db";
  import { reportTemplates } from "./shared/schema";
  import { eq } from "drizzle-orm";

  async function updateTemplates() {
    // Update attendance template to include related data
    await db.update(reportTemplates)
      .set({
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير الحضور والغياب الشامل</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الرتبة:</strong> {{rank}}</span>
    </div>
    <div class="row-item">
      <span><strong>حالة اليوم:</strong> {{status}}</span>
      <span><strong>التاريخ:</strong> {{date}}</span>
      <span><strong>الوحدة:</strong> {{unit}}</span>
    </div>
    <div class="row-item">
      <span><strong>إجمالي السجلات:</strong> {{attendanceCount}}</span>
      <span><strong>الحاضر:</strong> {{presentCount}}</span>
      <span><strong>الغائب:</strong> {{absentCount}}</span>
    </div>
    <div class="row-item">
      <span><strong>الأعذار النشطة:</strong> {{excusesCount}}</span>
      <span><strong>المخالفات:</strong> {{violationsCount}}</span>
    </div>
  </div>
  </div>`,
        description: "تقرير شامل للحضور والغياب مع بيانات من جميع الجداول المرتبطة"
      })
      .where(eq(reportTemplates.name, "تقرير الحضور والغياب"));

    // Update excuses template
    await db.update(reportTemplates)
      .set({
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير الأعذار والإجازات</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الرتبة:</strong> {{rank}}</span>
    </div>
    <div class="row-item">
      <span><strong>نوع العذر:</strong> {{type}}</span>
      <span><strong>من التاريخ:</strong> {{startDate}}</span>
      <span><strong>إلى التاريخ:</strong> {{endDate}}</span>
    </div>
    <div class="row-item">
      <span><strong>إجمالي الأعذار:</strong> {{excusesCount}}</span>
      <span><strong>الإجازات:</strong> {{leaveCount}}</span>
      <span><strong>الأمراض:</strong> {{sickCount}}</span>
    </div>
    <div class="row-item">
      <span><strong>السجن:</strong> {{imprisonmentCount}}</span>
      <span><strong>رقم التصريح:</strong> {{permissionNumber}}</span>
      <span><strong>جهة الاعتماد:</strong> {{approvedBy}}</span>
    </div>
  </div>
  </div>`,
        description: "تقرير شامل للأعذار والإجازات مع إحصائيات من جميع السجلات"
      })
      .where(eq(reportTemplates.name, "تقرير الإجازات والأعذار"));

    // Update violations template
    await db.update(reportTemplates)
      .set({
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير المخالفات الشامل</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الرتبة:</strong> {{rank}}</span>
    </div>
    <div class="row-item">
      <span><strong>الوحدة:</strong> {{unit}}</span>
      <span><strong>تاريخ المخالفة:</strong> {{date}}</span>
      <span><strong>السبب:</strong> {{reason}}</span>
    </div>
    <div class="row-item">
      <span><strong>العقوبة:</strong> {{punishment}}</span>
      <span><strong>الملاحظات:</strong> {{notes}}</span>
    </div>
    <div class="row-item">
      <span><strong>إجمالي المخالفات:</strong> {{violationsCount}}</span>
      <span><strong>سجلات الحضور:</strong> {{attendanceCount}}</span>
      <span><strong>الأعذار المسجلة:</strong> {{excusesCount}}</span>
    </div>
  </div>
  </div>`,
        description: "تقرير شامل للمخالفات مع إحصائيات سلوك الفرد الكاملة"
      })
      .where(eq(reportTemplates.name, "تقرير المخالفات"));

    console.log("✓ تم تحديث القوالب بنجاح");
  }

  updateTemplates().catch(console.error);
  