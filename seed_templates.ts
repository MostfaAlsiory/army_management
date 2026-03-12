
  import { db } from "./server/db";
  import { reportTemplates } from "./shared/schema";

  async function seed() {
    const templates = [
      {
        name: "تقرير القوة البشرية",
        description: "قالب لطباعة تقرير القوة البشرية",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير القوة البشرية</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الوحدة:</strong> {{unit}}</span>
      <span><strong>الكتيبة:</strong> {{battalion}}</span>
      <span><strong>الرتبة:</strong> {{rank}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>التخصص:</strong> {{specialization}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; } .row-item span { width: 19%; }`,
        isSystem: true
      },
      {
        name: "تقرير الحضور والغياب",
        description: "قالب لطباعة تقرير الحضور والغياب",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير الحضور والغياب</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الحالة:</strong> {{status}}</span>
      <span><strong>التاريخ:</strong> {{date}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; }`,
        isSystem: true
      },
      {
        name: "تقرير توزيع الأفراد",
        description: "قالب لطباعة تقرير توزيع الأفراد",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير توزيع الأفراد</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الوحدة:</strong> {{unit}}</span>
      <span><strong>الكتيبة:</strong> {{battalion}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>التخصص:</strong> {{specialization}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; }`,
        isSystem: true
      },
      {
        name: "تقرير المستحقين للترقية",
        description: "قالب لطباعة تقرير المستحقين للترقية",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير المستحقين للترقية</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الرتبة:</strong> {{rank}}</span>
      <span><strong>تاريخ آخر ترقية:</strong> {{lastPromotionDate}}</span>
      <span><strong>تاريخ الترقية القادمة:</strong> {{nextPromotionDate}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; }`,
        isSystem: true
      },
      {
        name: "تقرير الحركة اليومية",
        description: "قالب لطباعة تقرير الحركة اليومية",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير الحركة اليومية</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الوحدة:</strong> {{unit}}</span>
      <span><strong>الحالة:</strong> {{status}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; }`,
        isSystem: true
      },
      {
        name: "تقرير حالات التواجد",
        description: "قالب لطباعة تقرير حالات التواجد",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير حالات التواجد</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الرقم العسكري:</strong> {{militaryId}}</span>
      <span><strong>الاسم:</strong> {{fullName}}</span>
      <span><strong>الحالة الإدارية:</strong> {{adminStatus}}</span>
      <span><strong>الحالة الصحية:</strong> {{healthStatus}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; }`,
        isSystem: true
      },
      {
        name: "تقرير الإحصائيات العامة",
        description: "قالب لطباعة تقرير الإحصائيات العامة",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-center"><h2>تقرير الإحصائيات العامة</h2></div>
  </div>
  <div class="content">
    <div class="row-item">
      <span><strong>الوحدة:</strong> {{unit}}</span>
      <span><strong>الكتيبة:</strong> {{battalion}}</span>
      <span><strong>الرتبة:</strong> {{rank}}</span>
    </div>
  </div>
  </div>`,
        cssContent: `.report-container { font-family: 'Tajawal', sans-serif; padding: 20px; direction: rtl; border-bottom: 1px dashed #ccc; } .header { text-align: center; margin-bottom: 10px; } .row-item { display: flex; justify-content: space-between; padding: 5px; }`,
        isSystem: true
      }
    ];

    for (const template of templates) {
      const existing = await db.select().from(reportTemplates);
      if (!existing.some((t: any) => t.name === template.name)) {
        await db.insert(reportTemplates).values(template);
        console.log("Inserted:", template.name);
      } else {
        console.log("Already exists:", template.name);
      }
    }
    process.exit(0);
  }

  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
  