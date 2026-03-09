import { db, pool } from "../server/db";
import { soldiers, attendance, violations, excuses } from "../shared/schema";
import { faker } from '@faker-js/faker';

async function seed() {
  console.log("Starting database seeding...");

  // Clear existing data (optional, for development)
  await db.delete(excuses);
  await db.delete(violations);
  await db.delete(attendance);
  await db.delete(soldiers);
  console.log("Cleared existing data.");

  // 1. Seed Soldiers
  const ranks = ["جندي", "عريف", "رقيب", "ملازم", "نقيب", "رائد"];
  const units = ["الكتيبة الأولى", "الكتيبة الثانية", "الكتيبة الثالثة", "المدفعية", "المشاة"];
  const specializations = ["مشاة", "مدفعية", "استطلاع", "إشارة", "إمداد"];
  const adminStatuses = ["خدمة", "إجازة", "مستشفى"];
  const healthStatuses = ["لائق", "غير لائق مؤقت", "غير لائق دائم"];
  const maritalStatuses = ["أعزب", "متزوج"];

  const seededSoldiers = [];
  for (let i = 0; i < 10; i++) {
    const newSoldier = await db.insert(soldiers).values({
      militaryId: faker.string.alphanumeric(8).toUpperCase(),
      fullName: faker.person.fullName(),
      birthDate: faker.date.past({ years: 30, refDate: '2000-01-01' }).toISOString().split('T')[0],
      birthPlace: faker.location.city(),
      nationalId: faker.string.numeric(10),
      rank: faker.helpers.arrayElement(ranks),
      specialization: faker.helpers.arrayElement(specializations),
      unit: faker.helpers.arrayElement(units),
      battalion: faker.string.alphanumeric(5).toUpperCase(),
      joinDate: faker.date.past({ years: 10, refDate: '2015-01-01' }).toISOString().split('T')[0],
      adminStatus: faker.helpers.arrayElement(adminStatuses),
      healthStatus: faker.helpers.arrayElement(healthStatuses),
      maritalStatus: faker.helpers.arrayElement(maritalStatuses),
      phoneNumber: faker.phone.number('05########'),
      address: faker.location.streetAddress(true),
      closestRelative: faker.person.fullName(),
      photoPath: faker.image.avatar(),
    }).returning();
    seededSoldiers.push(newSoldier[0]);
  }
  console.log(`Seeded ${seededSoldiers.length} soldiers.`);

  // 2. Seed Attendance
  const attendanceStatuses = ["حاضر", "غائب", "إجازة", "مهمة"];
  for (const soldier of seededSoldiers) {
    for (let i = 0; i < 5; i++) { // 5 attendance records per soldier
      const date = faker.date.recent({ days: 30 }).toISOString().split('T')[0];
      await db.insert(attendance).values({
        soldierId: soldier.id,
        date: date,
        status: faker.helpers.arrayElement(attendanceStatuses),
      });
    }
  }
  console.log("Seeded attendance records.");

  // 3. Seed Violations
  const punishments = ["سجن", "خصم", "توبيخ", "إنذار"];
  for (let i = 0; i < 5; i++) { // 5 violation records
    const randomSoldier = faker.helpers.arrayElement(seededSoldiers);
    await db.insert(violations).values({
      soldierId: randomSoldier.id,
      date: faker.date.recent({ days: 60 }).toISOString().split('T')[0],
      reason: faker.lorem.sentence(),
      punishment: faker.helpers.arrayElement(punishments),
      notes: faker.lorem.paragraph(),
    });
  }
  console.log("Seeded violation records.");

  // 4. Seed Excuses
  const excuseTypes = ["إجازة مرضية", "إجازة عادية", "مهمة رسمية", "غياب بعذر"];
  for (let i = 0; i < 5; i++) { // 5 excuse records
    const randomSoldier = faker.helpers.arrayElement(seededSoldiers);
    const startDate = faker.date.recent({ days: 30 });
    const endDate = faker.date.soon({ days: 7, refDate: startDate });
    await db.insert(excuses).values({
      soldierId: randomSoldier.id,
      type: faker.helpers.arrayElement(excuseTypes),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      permissionNumber: faker.string.alphanumeric(6).toUpperCase(),
      approvedBy: faker.person.fullName(),
      notes: faker.lorem.paragraph(),
    });
  }
  console.log("Seeded excuse records.");

  await pool.end();
  console.log("Database seeding complete.");
}

seed().catch((err) => {
  console.error("Database seeding failed:", err);
  process.exit(1);
});
