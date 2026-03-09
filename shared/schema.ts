import { pgTable, text, serial, date, boolean, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const soldiers = pgTable("soldiers", {
  id: serial("id").primaryKey(),
  militaryId: varchar("military_id").notNull().unique(),
  fullName: varchar("full_name").notNull(),
  birthDate: date("birth_date").notNull(),
  birthPlace: varchar("birth_place").notNull(),
  nationalId: varchar("national_id").notNull().unique(),
  
  rank: varchar("rank").notNull(),
  specialization: varchar("specialization").notNull(),
  unit: varchar("unit").notNull(),
  battalion: varchar("battalion").notNull(),
  joinDate: date("join_date").notNull(),
  
  adminStatus: varchar("admin_status").notNull(), 
  healthStatus: varchar("health_status").notNull(),
  maritalStatus: varchar("marital_status").notNull(),
  
  phoneNumber: varchar("phone_number").notNull(),
  address: text("address").notNull(),
  closestRelative: varchar("closest_relative").notNull(),
  
  photoPath: text("photo_path"), 
  lastPromotionDate: date("last_promotion_date"),
  nextPromotionDate: date("next_promotion_date"),
  
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull(), // promotion, leave_end, leave_warning, absence_limit, violation_alert, prisoner_release
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"), // ID of soldier, leave, or violation
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  soldier: one(soldiers, {
    fields: [notifications.relatedId],
    references: [soldiers.id],
  }),
}));

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  soldierId: integer("soldier_id").references(() => soldiers.id).notNull(),
  date: date("date").notNull(),
  status: varchar("status").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceRelations = relations(attendance, ({ one }) => ({
  soldier: one(soldiers, {
    fields: [attendance.soldierId],
    references: [soldiers.id],
  }),
}));

export const violations = pgTable("violations", {
  id: serial("id").primaryKey(),
  soldierId: integer("soldier_id").references(() => soldiers.id).notNull(),
  date: date("date").notNull(),
  reason: text("reason").notNull(),
  punishment: varchar("punishment").notNull(), // e.g., سجن، خصم الخ
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const violationsRelations = relations(violations, ({ one }) => ({
  soldier: one(soldiers, {
    fields: [violations.soldierId],
    references: [soldiers.id],
  }),
}));

export const excuses = pgTable("excuses", {
  id: serial("id").primaryKey(),
  soldierId: integer("soldier_id").references(() => soldiers.id).notNull(),
  type: varchar("type").notNull(), // اجازة، غياب، مرض، مهمة، سجن الخ
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  permissionNumber: varchar("permission_number"),
  approvedBy: varchar("approved_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const excusesRelations = relations(excuses, ({ one }) => ({
  soldier: one(soldiers, {
    fields: [excuses.soldierId],
    references: [soldiers.id],
  }),
}));

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  actionType: varchar("action_type").notNull(), // CREATE, UPDATE, DELETE, EXPORT
  entityType: varchar("entity_type").notNull(), // شؤون الأفراد, الحضور والغياب, المخالفات, الأعذار, أخرى
  entityId: integer("entity_id"),
  userId: integer("user_id"), 
  userName: varchar("user_name").default('مدير النظام'),
  details: text("details"),
  oldData: text("old_data"),
  newData: text("new_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  htmlContent: text("html_content").notNull(),
  cssContent: text("css_content"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSoldierSchema = createInsertSchema(soldiers).omit({ id: true, createdAt: true, archived: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, createdAt: true });
export const insertViolationSchema = createInsertSchema(violations).omit({ id: true, createdAt: true });
export const insertExcuseSchema = createInsertSchema(excuses).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertReportTemplateSchema = createInsertSchema(reportTemplates).omit({ id: true, createdAt: true });

export type Soldier = typeof soldiers.$inferSelect;
export type InsertSoldier = z.infer<typeof insertSoldierSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Violation = typeof violations.$inferSelect;
export type InsertViolation = z.infer<typeof insertViolationSchema>;

export type Excuse = typeof excuses.$inferSelect;
export type InsertExcuse = z.infer<typeof insertExcuseSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = z.infer<typeof insertReportTemplateSchema>;

export type CreateSoldierRequest = InsertSoldier;
export type UpdateSoldierRequest = Partial<InsertSoldier> & { archived?: boolean };

export type CreateAttendanceRequest = InsertAttendance;
export type UpdateAttendanceRequest = Partial<InsertAttendance>;

export type CreateViolationRequest = InsertViolation;
export type UpdateViolationRequest = Partial<InsertViolation>;

export type CreateExcuseRequest = InsertExcuse;
export type UpdateExcuseRequest = Partial<InsertExcuse>;

export type CreateActivityLogRequest = InsertActivityLog;


export interface AttendanceReport {
  soldierId: number;
  fullName: string;
  militaryId: string;
  rank: string;
  unit: string;
  absences: number;
}
