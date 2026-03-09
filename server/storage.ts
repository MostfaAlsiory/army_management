import { db } from "./db";
import {
  soldiers, attendance, violations, excuses, notifications, reportTemplates,
  type Soldier, type InsertSoldier, type UpdateSoldierRequest,
  type Attendance, type InsertAttendance, type AttendanceReport,
  type Violation, type InsertViolation, type UpdateViolationRequest,
  type Excuse, type InsertExcuse, type UpdateExcuseRequest,
  type Notification, type InsertNotification,
  type ActivityLog, type InsertActivityLog, activityLogs,
  type ReportTemplate, type InsertReportTemplate
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  getSoldiers(search?: string, archived?: boolean): Promise<Soldier[]>;
  getSoldier(id: number): Promise<Soldier | undefined>;
  getSoldierByMilitaryId(militaryId: string): Promise<Soldier | undefined>;
  createSoldier(soldier: InsertSoldier): Promise<Soldier>;
  updateSoldier(id: number, updates: UpdateSoldierRequest): Promise<Soldier>;
  
  getAttendance(from?: string, to?: string, soldierId?: number): Promise<Attendance[]>;
  upsertAttendance(record: InsertAttendance): Promise<Attendance>;
  bulkUpsertAttendance(records: InsertAttendance[]): Promise<void>;
  getAbsenceReport(month?: string): Promise<AttendanceReport[]>;

  getViolations(soldierId?: number): Promise<Violation[]>;
  createViolation(violation: InsertViolation): Promise<Violation>;
  updateViolation(id: number, updates: UpdateViolationRequest): Promise<Violation>;
  deleteViolation(id: number): Promise<void>;

  getExcuses(soldierId?: number, date?: string): Promise<Excuse[]>;
  createExcuse(excuse: InsertExcuse): Promise<Excuse>;
  updateExcuse(id: number, updates: UpdateExcuseRequest): Promise<Excuse>;
  deleteExcuse(id: number): Promise<void>;
  getActiveExcuse(soldierId: number, date: string): Promise<Excuse | undefined>;
  
  // Notifications
  getNotifications(): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  generateAutomaticNotifications(): Promise<void>;

  // Activity Logs
  getActivityLogs(actionType?: string, entityType?: string, startDate?: string, endDate?: string): Promise<ActivityLog[]>;
  getActivityLog(id: number): Promise<ActivityLog | undefined>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: number): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: number, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate>;
  deleteReportTemplate(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSoldiers(search?: string, archived?: boolean): Promise<Soldier[]> {
    let conditions = [];
    
    if (archived !== undefined) {
      conditions.push(eq(soldiers.archived, archived));
    } else {
      conditions.push(eq(soldiers.archived, false));
    }
    
    if (search && search.trim()) {
      const cleanSearch = search.trim().replace(/[%_]/g, '\\$&');
      conditions.push(
        sql`${soldiers.militaryId} ILIKE ${'%' + cleanSearch + '%'} OR ${soldiers.fullName} ILIKE ${'%' + cleanSearch + '%'}`
      );
    }
    
    let query = db.select().from(soldiers);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(soldiers.createdAt));
    }
    
    return await query.orderBy(desc(soldiers.createdAt));
  }

  async getSoldier(id: number): Promise<Soldier | undefined> {
    const [soldier] = await db.select().from(soldiers).where(eq(soldiers.id, id));
    return soldier;
  }

  async getSoldierByMilitaryId(militaryId: string): Promise<Soldier | undefined> {
    const [soldier] = await db.select().from(soldiers).where(eq(soldiers.militaryId, militaryId));
    return soldier;
  }

  async createSoldier(soldier: InsertSoldier): Promise<Soldier> {
    const [newSoldier] = await db.insert(soldiers).values(soldier).returning();
    return newSoldier;
  }

  async updateSoldier(id: number, updates: UpdateSoldierRequest): Promise<Soldier> {
    const [updatedSoldier] = await db.update(soldiers).set(updates).where(eq(soldiers.id, id)).returning();
    return updatedSoldier;
  }

  async getAttendance(from?: string, to?: string, soldierId?: number): Promise<Attendance[]> {
    let conditions = [];
    
    if (from && to) {
      conditions.push(and(gte(attendance.date, from), lte(attendance.date, to)));
    } else if (from) {
      conditions.push(eq(attendance.date, from));
    }
    
    if (soldierId) {
      conditions.push(eq(attendance.soldierId, soldierId));
    }
    
    let query = db.select().from(attendance);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(attendance.date));
    }
    
    return await query.orderBy(desc(attendance.date));
  }

  async upsertAttendance(record: InsertAttendance): Promise<Attendance> {
    const [existing] = await db.select().from(attendance)
      .where(and(eq(attendance.soldierId, record.soldierId), eq(attendance.date, record.date)));
      
    if (existing) {
      const [updated] = await db.update(attendance).set({ status: record.status })
        .where(eq(attendance.id, existing.id)).returning();
      return updated;
    } else {
      const [newRecord] = await db.insert(attendance).values(record).returning();
      return newRecord;
    }
  }

  async bulkUpsertAttendance(records: InsertAttendance[]): Promise<void> {
    for (const record of records) {
      await this.upsertAttendance(record);
    }
  }

  async getAbsenceReport(month?: string): Promise<AttendanceReport[]> {
    let conditions = [eq(attendance.status, 'غائب')];
    
    if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`; 
      conditions.push(gte(attendance.date, startDate));
      conditions.push(lte(attendance.date, endDate));
    }
    
    const result = await db.select({
      soldierId: soldiers.id,
      fullName: soldiers.fullName,
      militaryId: soldiers.militaryId,
      rank: soldiers.rank,
      unit: soldiers.unit,
      absences: sql<number>`count(${attendance.id})::int`
    })
    .from(attendance)
    .innerJoin(soldiers, eq(attendance.soldierId, soldiers.id))
    .where(and(...conditions))
    .groupBy(soldiers.id)
    .orderBy(desc(sql<number>`count(${attendance.id})`));
    
    return result;
  }

  // Violations
  async getViolations(soldierId?: number): Promise<Violation[]> {
    let conditions = [];
    if (soldierId) {
      conditions.push(eq(violations.soldierId, soldierId));
    }
    
    let query = db.select().from(violations);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(violations.date));
    }
    return await query.orderBy(desc(violations.date));
  }

  async createViolation(violation: InsertViolation): Promise<Violation> {
    const [newViolation] = await db.insert(violations).values(violation).returning();
    return newViolation;
  }

  async updateViolation(id: number, updates: UpdateViolationRequest): Promise<Violation> {
    const [updated] = await db.update(violations).set(updates).where(eq(violations.id, id)).returning();
    return updated;
  }

  async deleteViolation(id: number): Promise<void> {
    await db.delete(violations).where(eq(violations.id, id));
  }

  // Excuses
  async getExcuses(soldierId?: number, date?: string): Promise<Excuse[]> {
    let conditions = [];
    if (soldierId) {
      conditions.push(eq(excuses.soldierId, soldierId));
    }
    if (date) {
      // Find excuses where date is between startDate and endDate
      conditions.push(and(lte(excuses.startDate, date), gte(excuses.endDate, date)));
    }
    
    let query = db.select().from(excuses);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(excuses.startDate));
    }
    return await query.orderBy(desc(excuses.startDate));
  }

  async createExcuse(excuse: InsertExcuse): Promise<Excuse> {
    const [newExcuse] = await db.insert(excuses).values(excuse).returning();
    return newExcuse;
  }

  async updateExcuse(id: number, updates: UpdateExcuseRequest): Promise<Excuse> {
    const [updated] = await db.update(excuses).set(updates).where(eq(excuses.id, id)).returning();
    return updated;
  }

  async deleteExcuse(id: number): Promise<void> {
    await db.delete(excuses).where(eq(excuses.id, id));
  }

  async getActiveExcuse(soldierId: number, date: string): Promise<Excuse | undefined> {
    const [excuse] = await db.select().from(excuses)
      .where(and(
        eq(excuses.soldierId, soldierId),
        lte(excuses.startDate, date),
        gte(excuses.endDate, date)
      ))
      .limit(1);
    return excuse;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getActivityLogs(actionType?: string, entityType?: string, startDate?: string, endDate?: string): Promise<ActivityLog[]> {
    let conditions = [];
    if (actionType) conditions.push(eq(activityLogs.actionType, actionType));
    if (entityType) conditions.push(eq(activityLogs.entityType, entityType));
    if (startDate && endDate) {
      conditions.push(and(gte(activityLogs.createdAt, new Date(startDate)), lte(activityLogs.createdAt, new Date(endDate + 'T23:59:59.999Z'))));
    } else if (startDate) {
      conditions.push(gte(activityLogs.createdAt, new Date(startDate)));
    }
    
    let query = db.select().from(activityLogs);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(activityLogs.createdAt));
    }
    return await query.orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLog(id: number): Promise<ActivityLog | undefined> {
    const [log] = await db.select().from(activityLogs).where(eq(activityLogs.id, id));
    return log;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    return await db.select().from(reportTemplates).orderBy(desc(reportTemplates.createdAt));
  }

  async getReportTemplate(id: number): Promise<ReportTemplate | undefined> {
    const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
    return template;
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    const [newTemplate] = await db.insert(reportTemplates).values(template).returning();
    return newTemplate;
  }

  async updateReportTemplate(id: number, updates: Partial<InsertReportTemplate>): Promise<ReportTemplate> {
    const [updated] = await db.update(reportTemplates).set(updates).where(eq(reportTemplates.id, id)).returning();
    return updated;
  }

  async deleteReportTemplate(id: number): Promise<void> {
    await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  }

  async generateAutomaticNotifications(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    // Helper to check if notification already exists recently (to avoid duplicates)
    const hasRecentNotification = async (type: string, relatedId: number) => {
      const existing = await db.select().from(notifications).where(
        and(
          eq(notifications.type, type),
          eq(notifications.relatedId, relatedId)
        )
      );
      // Check if there is one created today
      return existing.some(n => new Date(n.createdAt).toISOString().split('T')[0] === today);
    };

    // 1. Promotions
    const duePromotions = await db.select().from(soldiers).where(lte(soldiers.nextPromotionDate, today));
    for (const soldier of duePromotions) {
      if (!(await hasRecentNotification('promotion', soldier.id))) {
        await this.createNotification({
          type: 'promotion',
          title: 'ترقية مستحقة',
          message: `الجندي ${soldier.fullName} مستحق للترقية اليوم.`,
          relatedId: soldier.id,
        });
      }
    }

    // 2. Leave Warnings (3 days before end)
    const endingSoonLeaves = await db.select().from(excuses).where(eq(excuses.endDate, threeDaysLaterStr));
    for (const leave of endingSoonLeaves) {
      if (!(await hasRecentNotification('leave_warning', leave.soldierId))) {
        const soldier = await this.getSoldier(leave.soldierId);
        await this.createNotification({
          type: 'leave_warning',
          title: 'تنبيه انتهاء إجازة',
          message: `إجازة الجندي ${soldier?.fullName} ستنتهي خلال 3 أيام.`,
          relatedId: leave.soldierId,
        });
      }
    }

    // 3. Leave Ends (Today)
    const endedLeaves = await db.select().from(excuses).where(eq(excuses.endDate, today));
    for (const leave of endedLeaves) {
      if (!(await hasRecentNotification('leave_end', leave.soldierId))) {
        const soldier = await this.getSoldier(leave.soldierId);
        await this.createNotification({
          type: 'leave_end',
          title: 'انتهاء إجازة',
          message: `إجازة الجندي ${soldier?.fullName} تنتهي اليوم.`,
          relatedId: leave.soldierId,
        });
      }
    }

    // 4. Prisoner Release
    const prisonerReleases = await db.select().from(violations).where(and(eq(violations.punishment, 'سجن'), eq(violations.date, today)));
    for (const violation of prisonerReleases) {
      if (!(await hasRecentNotification('prisoner_release', violation.soldierId))) {
        const soldier = await this.getSoldier(violation.soldierId);
        await this.createNotification({
          type: 'prisoner_release',
          title: 'تنبيه إفراج',
          message: `موعد الإفراج عن الجندي ${soldier?.fullName} هو اليوم بناءً على العقوبة المسجلة.`,
          relatedId: violation.soldierId,
        });
      }
    }

    // 5. Absence Limit (Exceeding e.g. 5 days of absence in a month)
    const currentMonth = today.substring(0, 7);
    const absenceReport = await this.getAbsenceReport(currentMonth);
    for (const report of absenceReport) {
      if (report.absences >= 5) {
        if (!(await hasRecentNotification('absence_limit', report.soldierId))) {
          await this.createNotification({
            type: 'absence_limit',
            title: 'تجاوز حد الغياب',
            message: `الجندي ${report.fullName} تجاوز حد الغياب المسموح به (${report.absences} أيام غياب هذا الشهر).`,
            relatedId: report.soldierId,
          });
        }
      }
    }

    // 6. Discipline/Violations (3 or more total violations)
    const allViolations = await db.select().from(violations);
    const violationsCount: Record<number, number> = {};
    for (const v of allViolations) {
      violationsCount[v.soldierId] = (violationsCount[v.soldierId] || 0) + 1;
    }
    for (const [soldierIdStr, count] of Object.entries(violationsCount)) {
      if (count >= 3) {
        const soldierId = parseInt(soldierIdStr);
        if (!(await hasRecentNotification('violation_alert', soldierId))) {
          const soldier = await this.getSoldier(soldierId);
          await this.createNotification({
            type: 'violation_alert',
            title: 'تنبيه انضباط',
            message: `الجندي ${soldier?.fullName} لديه سجل مخالفات متكرر (${count} مخالفات). يرجى مراجعة انضباطه.`,
            relatedId: soldierId,
          });
        }
      }
    }
  }
}

export const storage = new DatabaseStorage();
