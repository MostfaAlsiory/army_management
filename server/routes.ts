import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import multer from "multer";
import { soldiers, attendance, violations, excuses } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createBackup, restoreBackup, listBackups, deleteBackup, getBackupSettings, saveBackupSettings } from "./backup";

const execPromise = promisify(exec);

const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "client", "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `temp_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage: storage_config });

async function logActivity(actionType: string, entityType: string, entityId: number | null, details: string, oldData?: any, newData?: any) {
  try {
    await storage.createActivityLog({
      actionType,
      entityType,
      entityId,
      details,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.soldiers.list.path, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const archived = req.query.archived === 'true' ? true : req.query.archived === 'false' ? false : undefined;
      const data = await storage.getSoldiers(search, archived);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/soldiers/upload-photo", upload.single("photo"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({ tempPath: req.file.filename });
  });

  app.get(api.soldiers.get.path, async (req, res) => {
    try {
      const soldier = await storage.getSoldier(Number(req.params.id));
      if (!soldier) {
        return res.status(404).json({ message: 'Soldier not found' });
      }
      res.json(soldier);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.soldiers.create.path, async (req, res) => {
    try {
      const input = api.soldiers.create.input.parse(req.body);
      const existing = await storage.getSoldierByMilitaryId(input.militaryId);
      if (existing) {
        return res.status(400).json({ message: "الرقم العسكري مسجل مسبقاً", field: "militaryId" });
      }

      let finalPhotoPath = input.photoPath;
      if (input.photoPath && input.photoPath.startsWith("temp_")) {
        const ext = path.extname(input.photoPath);
        const newFileName = `${input.militaryId}_${input.fullName.replace(/\s+/g, '_')}${ext}`;
        const oldPath = path.join(process.cwd(), "client", "public", "uploads", input.photoPath);
        const newPath = path.join(process.cwd(), "client", "public", "uploads", newFileName);
        
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          finalPhotoPath = `/uploads/${newFileName}`;
        }
      }

      const newSoldier = await storage.createSoldier({ ...input, photoPath: finalPhotoPath });
      await logActivity('إضافة', 'شؤون الأفراد', newSoldier.id, `إضافة جندي جديد: ${newSoldier.fullName}`, null, newSoldier);
      res.status(201).json(newSoldier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.soldiers.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const soldier = await storage.getSoldier(id);
      if (!soldier) {
        return res.status(404).json({ message: 'Soldier not found' });
      }
      const input = api.soldiers.update.input.parse(req.body);

      let finalPhotoPath = input.photoPath;
      if (input.photoPath && input.photoPath.startsWith("temp_")) {
        const ext = path.extname(input.photoPath);
        const mId = input.militaryId || soldier.militaryId;
        const fName = input.fullName || soldier.fullName;
        const newFileName = `${mId}_${fName.replace(/\s+/g, '_')}${ext}`;
        const oldPath = path.join(process.cwd(), "client", "public", "uploads", input.photoPath);
        const newPath = path.join(process.cwd(), "client", "public", "uploads", newFileName);
        
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          finalPhotoPath = `/uploads/${newFileName}`;
        }
      }

      const updatedSoldier = await storage.updateSoldier(id, { ...input, photoPath: finalPhotoPath });
      await logActivity('تعديل', 'شؤون الأفراد', updatedSoldier.id, `تعديل بيانات الجندي: ${updatedSoldier.fullName}`, soldier, updatedSoldier);
      res.json(updatedSoldier);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.attendance.list.path, async (req, res) => {
    try {
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const date = req.query.date as string | undefined;
      const soldierId = req.query.soldierId ? Number(req.query.soldierId) : undefined;
      
      const data = await storage.getAttendance(from || date, to, soldierId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.attendance.createOrUpdate.path, async (req, res) => {
    try {
      const bodySchema = api.attendance.createOrUpdate.input.extend({
        soldierId: z.coerce.number()
      });
      const input = bodySchema.parse(req.body);
      const record = await storage.upsertAttendance(input);
      await logActivity('إضافة/تعديل', 'الحضور والغياب', record.soldierId, `تسجيل حالة (${record.status}) للجندي بتاريخ ${record.date}`, null, record);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.attendance.bulkCreateOrUpdate.path, async (req, res) => {
    try {
      const input = api.attendance.bulkCreateOrUpdate.input.parse(req.body);
      await storage.bulkUpsertAttendance(input.records);
      await logActivity('إضافة/تعديل جماعي', 'الحضور والغياب', null, `تسجيل حضور وغياب جماعي لعدد ${input.records.length} جنود`, null, input.records);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.attendance.report.path, async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const data = await storage.getAbsenceReport(month);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Violations
  app.get(api.violations.list.path, async (req, res) => {
    try {
      const soldierId = req.query.soldierId ? Number(req.query.soldierId) : undefined;
      const data = await storage.getViolations(soldierId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.violations.create.path, async (req, res) => {
    try {
      const bodySchema = api.violations.create.input.extend({
        soldierId: z.coerce.number()
      });
      const input = bodySchema.parse(req.body);
      const violation = await storage.createViolation(input);
      
      // Generate notification for new violation
      const soldier = await storage.getSoldier(violation.soldierId);
      await storage.createNotification({
        type: 'violation_alert',
        title: 'مخالفة جديدة',
        message: `تم تسجيل مخالفة جديدة للجندي ${soldier?.fullName}: ${violation.reason}`,
        relatedId: violation.soldierId,
      });

      await logActivity('إضافة', 'المخالفات والجزاءات', violation.soldierId, `تسجيل مخالفة جديدة للجندي ${soldier?.fullName || violation.soldierId}`, null, violation);
      res.status(201).json(violation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.violations.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const oldViolation = await storage.getViolations(undefined).then(vs => vs.find(v => v.id === id));
      const input = api.violations.update.input.parse(req.body);
      const updated = await storage.updateViolation(id, input);
      await logActivity('تعديل', 'المخالفات والجزاءات', updated.soldierId, `تعديل مخالفة للجندي ${updated.soldierId}`, oldViolation, updated);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.violations.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const oldViolation = await storage.getViolations(undefined).then(vs => vs.find(v => v.id === id));
      await storage.deleteViolation(id);
      if (oldViolation) {
        await logActivity('حذف', 'المخالفات والجزاءات', oldViolation.soldierId, `حذف مخالفة للجندي ${oldViolation.soldierId}`, oldViolation, null);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Excuses
  app.get(api.excuses.list.path, async (req, res) => {
    try {
      const soldierId = req.query.soldierId ? Number(req.query.soldierId) : undefined;
      const date = req.query.date as string | undefined;
      const data = await storage.getExcuses(soldierId, date);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.excuses.create.path, async (req, res) => {
    try {
      const bodySchema = api.excuses.create.input.extend({
        soldierId: z.coerce.number()
      });
      const input = bodySchema.parse(req.body);
      const excuse = await storage.createExcuse(input);

      // Generate notification for new excuse/leave
      const soldier = await storage.getSoldier(excuse.soldierId);
      await storage.createNotification({
        type: 'leave_warning',
        title: 'إجازة/عذر جديد',
        message: `تم تسجيل ${excuse.type} للجندي ${soldier?.fullName} تبدأ من ${excuse.startDate} وتنتهي في ${excuse.endDate}`,
        relatedId: excuse.soldierId,
      });

      await logActivity('إضافة', 'الأعذار والإجازات', excuse.soldierId, `إضافة ${excuse.type} للجندي ${soldier?.fullName || excuse.soldierId}`, null, excuse);
      res.status(201).json(excuse);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.excuses.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const oldExcuse = await storage.getExcuses(undefined, undefined).then(ex => ex.find(e => e.id === id));
      const input = api.excuses.update.input.parse(req.body);
      const updated = await storage.updateExcuse(id, input);
      await logActivity('تعديل', 'الأعذار والإجازات', updated.soldierId, `تعديل ${updated.type} للجندي ${updated.soldierId}`, oldExcuse, updated);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.excuses.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const oldExcuse = await storage.getExcuses(undefined, undefined).then(ex => ex.find(e => e.id === id));
      await storage.deleteExcuse(id);
      if (oldExcuse) {
        await logActivity('حذف', 'الأعذار والإجازات', oldExcuse.soldierId, `حذف ${oldExcuse.type} للجندي ${oldExcuse.soldierId}`, oldExcuse, null);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/download-project', async (_req, res) => {
    try {
      const projectRoot = process.cwd();
      const timestamp = new Date().toISOString().split('T')[0];
      const tarFileName = `army-personnel-system_${timestamp}.tar.gz`;
      const tempTarPath = path.join(projectRoot, `temp_${tarFileName}`);

      // Create tar.gz archive excluding node_modules, .git, and other unnecessary files
      const excludePatterns = [
        '--exclude=node_modules',
        '--exclude=.next',
        '--exclude=.nuxt',
        '--exclude=dist',
        '--exclude=build',
        '--exclude=.git',
        '--exclude=.gitignore',
        '--exclude=.env',
        '--exclude=.env.local',
        '--exclude=.env.*.local',
        '--exclude=*.log',
        '--exclude=npm-debug.log*',
        '--exclude=yarn-debug.log*',
        '--exclude=pnpm-debug.log*',
        '--exclude=temp_*',
        '--exclude=.DS_Store',
        '--exclude=extracted_system',
        '--exclude=attached_assets',
        '--exclude=.idea',
        '--exclude=.vscode',
        '--exclude=*.swp',
        '--exclude=*.swo'
      ];

      const tarCommand = `tar -czf "${tempTarPath}" ${excludePatterns.join(' ')} -C "${projectRoot}" .`;
      
      console.log('[backup] Creating tar archive...');
      await execPromise(tarCommand);

      // Check if file exists and has content
      if (!fs.existsSync(tempTarPath)) {
        throw new Error('فشل في إنشاء ملف الأرشيف');
      }

      const fileSize = fs.statSync(tempTarPath).size;
      if (fileSize === 0) {
        throw new Error('الملف المنشأ فارغ');
      }

      // Send the tar file
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="${tarFileName}"`);
      res.setHeader('Content-Length', fileSize);

      // Stream the file and clean up after sending
      const fileStream = fs.createReadStream(tempTarPath);
      fileStream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'خطأ في تحميل الملف' });
        }
      });

      fileStream.pipe(res);

      // Clean up the temporary tar file after sending
      res.on('finish', () => {
        fs.unlink(tempTarPath, (err) => {
          if (err) console.error('Failed to cleanup temp tar file:', err);
        });
      });

      console.log(`[backup] Project archive created: ${tarFileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    } catch (err) {
      console.error("Download error:", err);
      res.status(500).json({ 
        message: "فشل في تحضير ملف التحميل",
        error: (err as Error).message
      });
    }
  });

  // Backups API
  app.get(api.backups.list.path, (_req, res) => {
    try {
      const type = _req.query.type as any;
      const sortBy = _req.query.sortBy as any;
      const search = _req.query.search as string | undefined;
      const fromDate = _req.query.fromDate as string | undefined;
      const toDate = _req.query.toDate as string | undefined;
      const minSize = _req.query.minSize ? parseInt(_req.query.minSize as string) : undefined;
      const maxSize = _req.query.maxSize ? parseInt(_req.query.maxSize as string) : undefined;
      
      const backups = listBackups({ type, sortBy, search, fromDate, toDate, minSize, maxSize });
      res.json(backups);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.backups.create.path, async (req, res) => {
    try {
      const backupType = req.body?.backupType || 'full';
      const backup = await createBackup(true, backupType);
      await logActivity('النسخ الاحتياطي', 'النسخ الاحتياطي', null, `إنشاء نسخة احتياطية يدوية ${backupType === 'incremental' ? 'جزئية' : 'كاملة'}: ${backup.filename}`, null, null);
      res.status(201).json(backup);
    } catch (err) {
      console.error("Backup creation failed:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.backups.restore.path, async (req, res) => {
    try {
      await restoreBackup(req.params.filename);
      await logActivity('استعادة', 'النسخ الاحتياطي', null, `استعادة النظام من نسخة احتياطية: ${req.params.filename}`, null, null);
      res.json({ success: true });
    } catch (err) {
      console.error("Backup restore failed:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.backups.delete.path, async (req, res) => {
    try {
      deleteBackup(req.params.filename);
      await logActivity('حذف', 'النسخ الاحتياطي', null, `حذف نسخة احتياطية: ${req.params.filename}`, null, null);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.backups.settings.get.path, (_req, res) => {
    try {
      res.json(getBackupSettings());
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.backups.settings.update.path, async (req, res) => {
    try {
      const settings = api.backups.settings.update.input.parse(req.body);
      saveBackupSettings(settings as any);
      await logActivity('تعديل', 'النسخ الاحتياطي', null, `تحديث إعدادات النسخ الاحتياطي التلقائي`, null, null);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid settings" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications API
  app.get("/api/notifications", async (_req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications/generate", async (_req, res) => {
    try {
      await storage.generateAutomaticNotifications();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Activity Logs API
  app.get(api.activityLogs.list.path, async (req, res) => {
    try {
      const { actionType, entityType, startDate, endDate } = req.query as any;
      const logs = await storage.getActivityLogs(actionType, entityType, startDate, endDate);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.activityLogs.undo.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const takeBackup = req.body.takeBackup === true;
      const log = await storage.getActivityLog(id);

      if (!log) {
        return res.status(404).json({ message: 'السجل غير موجود' });
      }

      // Prevent undoing backup, restore, and bulk operations - these are critical operations
      const nonUndoableActions = ['النسخ الاحتياطي', 'استعادة', 'تعديل جماعي', 'إضافة/تعديل جماعي'];
      if (nonUndoableActions.includes(log.actionType) || log.entityType === 'النسخ الاحتياطي') {
        return res.status(400).json({ message: 'لا يمكن التراجع عن هذه العملية - عمليات النسخ الاحتياطي والاستعادة محمية من التراجع' });
      }

      let backupUrl;
      if (takeBackup) {
        // Create backup logic (simplified here to JSON export)
        try {
          const allData = {
            soldiers: await storage.getSoldiers(undefined, false),
            attendance: await storage.getAttendance(),
            violations: await storage.getViolations(),
            excuses: await storage.getExcuses()
          };
          const backupFileName = `backup_${Date.now()}.json`;
          const uploadDir = path.join(process.cwd(), "client", "public", "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const backupPath = path.join(uploadDir, backupFileName);
          fs.writeFileSync(backupPath, JSON.stringify(allData, null, 2));
          backupUrl = `/uploads/${backupFileName}`;
        } catch (backupErr) {
          console.error('Backup creation error:', backupErr);
        }
      }

      // Undo logic based on actionType and oldData/newData
      const oldData = log.oldData ? JSON.parse(log.oldData) : null;
      const newData = log.newData ? JSON.parse(log.newData) : null;

      try {
        if (log.actionType === 'إضافة' && newData && newData.id) {
          // Delete the added item
          if (log.entityType === 'شؤون الأفراد') {
            await storage.updateSoldier(newData.id, { archived: true });
          } else if (log.entityType === 'الحضور والغياب') {
            try {
              await db.delete(attendance).where(eq(attendance.id, newData.id));
            } catch (e) {
              console.warn('Could not delete attendance record:', e);
            }
          } else if (log.entityType === 'المخالفات والجزاءات') {
            try {
              await storage.deleteViolation(newData.id);
            } catch (e) {
              console.warn('Could not delete violation:', e);
            }
          } else if (log.entityType === 'الأعذار والإجازات') {
            try {
              await storage.deleteExcuse(newData.id);
            } catch (e) {
              console.warn('Could not delete excuse:', e);
            }
          }
        } else if (log.actionType === 'تعديل' && oldData && oldData.id) {
          // Revert to old item - filter out system fields and undefined values
          if (log.entityType === 'شؤون الأفراد') {
            const { id, createdAt, ...updateData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== null)
            );
            await storage.updateSoldier(oldData.id, cleanData as any);
          } else if (log.entityType === 'الحضور والغياب') {
            const { createdAt, ...updateData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== null)
            );
            // Ensure we have soldierId and date for attendance upsert
            if (cleanData.soldierId && cleanData.date) {
              await storage.upsertAttendance(cleanData as any);
            }
          } else if (log.entityType === 'المخالفات والجزاءات') {
            const { id, createdAt, ...updateData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== null)
            );
            if (Object.keys(cleanData).length > 0) {
              await storage.updateViolation(oldData.id, cleanData as any);
            }
          } else if (log.entityType === 'الأعذار والإجازات') {
            const { id, createdAt, ...updateData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(updateData).filter(([_, v]) => v !== undefined && v !== null)
            );
            if (Object.keys(cleanData).length > 0) {
              await storage.updateExcuse(oldData.id, cleanData as any);
            }
          }
        } else if (log.actionType === 'حذف' && oldData && oldData.id) {
          // Restore deleted item
          if (log.entityType === 'شؤون الأفراد') {
            const { id, createdAt, ...restoreData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(restoreData).filter(([_, v]) => v !== undefined && v !== null)
            );
            // Try to recreate the soldier with the old data
            try {
              await storage.createSoldier(cleanData as any);
            } catch (createErr) {
              console.warn('Could not restore soldier:', createErr);
            }
          } else if (log.entityType === 'المخالفات والجزاءات') {
            const { id, createdAt, ...restoreData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(restoreData).filter(([_, v]) => v !== undefined && v !== null)
            );
            try {
              await storage.createViolation(cleanData as any);
            } catch (createErr) {
              console.warn('Could not restore violation:', createErr);
            }
          } else if (log.entityType === 'الأعذار والإجازات') {
            const { id, createdAt, ...restoreData } = oldData;
            const cleanData = Object.fromEntries(
              Object.entries(restoreData).filter(([_, v]) => v !== undefined && v !== null)
            );
            try {
              await storage.createExcuse(cleanData as any);
            } catch (createErr) {
              console.warn('Could not restore excuse:', createErr);
            }
          }
        }
      } catch (undoErr) {
        console.error('Undo operation error:', undoErr);
        throw new Error(`فشل في تنفيذ التراجع: ${(undoErr as any).message}`);
      }

      await logActivity('إلغاء حركة', log.entityType, log.entityId, `تم إلغاء الحركة رقم: ${log.id}`);
      res.json({ success: true, backupUrl, message: 'تم التراجع عن الحركة بنجاح' });
    } catch (err) {
      console.error('Undo handler error:', err);
      res.status(500).json({ message: `فشل في التراجع عن الحركة: ${(err as any).message}` });
    }
  });

  // Report Templates API
  app.get(api.reportTemplates.list.path, async (_req, res) => {
    try {
      const templates = await storage.getReportTemplates();
      res.json(templates);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.reportTemplates.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getReportTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.reportTemplates.create.path, async (req, res) => {
    try {
      const input = api.reportTemplates.create.input.parse(req.body);
      const template = await storage.createReportTemplate(input);
      await logActivity('إضافة', 'قوالب التقارير', template.id, `إضافة قالب تقرير جديد: ${template.name}`, null, template);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.reportTemplates.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldTemplate = await storage.getReportTemplate(id);
      if (!oldTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      const input = api.reportTemplates.update.input.parse(req.body);
      const updated = await storage.updateReportTemplate(id, input);
      await logActivity('تعديل', 'قوالب التقارير', updated.id, `تعديل قالب تقرير: ${updated.name}`, oldTemplate, updated);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.reportTemplates.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const oldTemplate = await storage.getReportTemplate(id);
      if (!oldTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      if (oldTemplate.isSystem) {
        return res.status(400).json({ message: "لا يمكن حذف قالب النظام الأساسي" });
      }
      await storage.deleteReportTemplate(id);
      await logActivity('حذف', 'قوالب التقارير', id, `حذف قالب تقرير: ${oldTemplate.name}`, oldTemplate, null);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  seedDatabase().catch(console.error);
  // Trigger automatic notifications on startup
  storage.generateAutomaticNotifications().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  try {
    const existing = await storage.getSoldiers();
    if (existing.length === 0) {
      const s1 = await storage.createSoldier({
        militaryId: "M-1001",
        fullName: "أحمد محمد عبدالله",
        birthDate: "1995-05-15",
        birthPlace: "الرياض",
        nationalId: "1020304050",
        rank: "رقيب",
        specialization: "مشاة",
        unit: "السرية الأولى",
        battalion: "الكتيبة 55",
        joinDate: "2018-03-01",
        adminStatus: "على رأس العمل",
        healthStatus: "لائق طبياً",
        maritalStatus: "متزوج",
        phoneNumber: "0500000001",
        address: "حي الملقا، الرياض",
        closestRelative: "محمد عبدالله (أب)",
        photoPath: null
      });

      const s2 = await storage.createSoldier({
        militaryId: "M-1002",
        fullName: "سالم فهد الدوسري",
        birthDate: "1998-11-20",
        birthPlace: "الدمام",
        nationalId: "1020304051",
        rank: "عريف",
        specialization: "سائق",
        unit: "السرية الثانية",
        battalion: "الكتيبة 55",
        joinDate: "2020-07-15",
        adminStatus: "على رأس العمل",
        healthStatus: "لائق طبياً",
        maritalStatus: "أعزب",
        phoneNumber: "0500000002",
        address: "حي الشاطئ، الدمام",
        closestRelative: "فهد الدوسري (أب)",
        photoPath: null
      });

      const today = new Date().toISOString().split('T')[0];
      await storage.bulkUpsertAttendance([
        { soldierId: s1.id, date: today, status: "حاضر" },
        { soldierId: s2.id, date: today, status: "مهمة" },
      ]);
    }
    
    // Seed default report templates if none exist
    const templates = await storage.getReportTemplates();
    if (templates.length === 0) {
      await storage.createReportTemplate({
        name: "التقرير الشامل الافتراضي",
        description: "قالب افتراضي لطباعة التقارير مع شعار ومعلومات أساسية",
        htmlContent: `<div class="report-container">
  <div class="header">
    <div class="header-right">
      <h3>المملكة العربية السعودية</h3>
      <h3>وزارة الدفاع</h3>
      <h3>القيادة العامة</h3>
    </div>
    <div class="header-center">
      <img src="/logo.png" alt="الشعار" style="width: 80px; height: 80px;" onerror="this.style.display='none'">
      <h2>تقرير بيانات الفرد</h2>
    </div>
    <div class="header-left">
      <p>التاريخ: {{currentDate}}</p>
    </div>
  </div>
  
  <div class="content">
    <table class="info-table">
      <tr>
        <th>الرقم العسكري:</th>
        <td>{{militaryId}}</td>
        <th>الاسم الكامل:</th>
        <td>{{fullName}}</td>
      </tr>
      <tr>
        <th>الرتبة:</th>
        <td>{{rank}}</td>
        <th>التخصص:</th>
        <td>{{specialization}}</td>
      </tr>
      <tr>
        <th>الوحدة:</th>
        <td>{{unit}}</td>
        <th>الكتيبة:</th>
        <td>{{battalion}}</td>
      </tr>
      <tr>
        <th>حالة التواجد:</th>
        <td>{{status}}</td>
        <th>تاريخ التقرير:</th>
        <td>{{date}}</td>
      </tr>
    </table>
  </div>
  
  <div class="footer">
    <div class="signatures">
      <div class="sig-box">
        <p>المعد</p>
        <p>................</p>
      </div>
      <div class="sig-box">
        <p>المدقق</p>
        <p>................</p>
      </div>
      <div class="sig-box">
        <p>القائد / المدير</p>
        <p>................</p>
      </div>
    </div>
  </div>
</div>`,
        cssContent: `.report-container {
  font-family: 'Tajawal', 'Cairo', sans-serif;
  padding: 20mm;
  direction: rtl;
  color: #000;
}
.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #000;
  padding-bottom: 15px;
  margin-bottom: 25px;
}
.header-right, .header-left, .header-center {
  text-align: center;
}
.header h2, .header h3 {
  margin: 5px 0;
}
.info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
.info-table th, .info-table td {
  border: 1px solid #000;
  padding: 10px;
  text-align: right;
}
.info-table th {
  background-color: #f0f0f0;
  font-weight: bold;
  width: 15%;
}
.info-table td {
  width: 35%;
}
.footer {
  margin-top: 50px;
}
.signatures {
  display: flex;
  justify-content: space-around;
}
.sig-box {
  text-align: center;
}`,
        isSystem: true
      });
      
      await storage.createReportTemplate({
        name: "بطاقة تعريف مبسطة",
        description: "بطاقة صغيرة لطباعة بيانات الفرد الأساسية",
        htmlContent: `<div class="card">
  <div class="card-header">
    <h3>بطاقة تعريف فرد</h3>
  </div>
  <div class="card-body">
    <p><strong>الاسم:</strong> {{fullName}}</p>
    <p><strong>الرقم العسكري:</strong> {{militaryId}}</p>
    <p><strong>الرتبة:</strong> {{rank}}</p>
    <p><strong>الوحدة:</strong> {{unit}}</p>
  </div>
</div>`,
        cssContent: `.card {
  border: 2px solid #000;
  border-radius: 10px;
  width: 85mm;
  height: 55mm;
  padding: 10px;
  margin: 10px;
  direction: rtl;
  font-family: 'Tajawal', sans-serif;
  display: inline-block;
}
.card-header {
  text-align: center;
  border-bottom: 1px solid #000;
  margin-bottom: 10px;
  background-color: #e0e0e0;
}
.card-body p {
  margin: 5px 0;
  font-size: 14px;
}`,
        isSystem: true
      });
    }
  } catch (err) {
    console.error("Failed to seed db:", err);
  }
}
