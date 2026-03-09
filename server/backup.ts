import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { db } from "./db";

const execPromise = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), "server", "backups");
const SETTINGS_FILE = path.join(BACKUP_DIR, "settings.json");
const METADATA_FILE = path.join(BACKUP_DIR, "metadata.json");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export interface BackupMetadata {
  filename: string;
  createdAt: string;
  type: 'full' | 'incremental';
  size: number;
  description?: string;
  baseBackup?: string; // reference to the full backup this incremental is based on
}

export interface BackupSettings {
  autoBackupEnabled: boolean;
  intervalHours: number;
  autoBackupType: 'full' | 'incremental'; // Type of automatic backups
}

const defaultSettings: BackupSettings = {
  autoBackupEnabled: false,
  intervalHours: 24,
  autoBackupType: 'full',
};

function getBackupMetadata(): Map<string, BackupMetadata> {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(METADATA_FILE, "utf-8"));
      return new Map(data);
    }
  } catch (e) {
    console.error("Error reading backup metadata", e);
  }
  return new Map();
}

function saveBackupMetadata(metadata: Map<string, BackupMetadata>) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(Array.from(metadata.entries()), null, 2));
}

export function getBackupSettings(): BackupSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading backup settings", e);
  }
  return defaultSettings;
}

export function saveBackupSettings(settings: BackupSettings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  scheduleAutoBackup();
}

export async function createBackup(manual: boolean = true, backupType: 'full' | 'incremental' = 'full') {
  const dateStr = new Date().toLocaleString("en-GB", { timeZone: "Asia/Riyadh" })
    .replace(/[\/,:]/g, "-").replace(/\s/g, "_");
  const typeStr = backupType === 'incremental' ? 'inc' : 'full';
  const filename = `backup_${manual ? 'manual' : 'auto'}_${typeStr}_${dateStr}.dump`;
  const filepath = path.join(BACKUP_DIR, filename);
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const allMetadata = getBackupMetadata();
  
  // For incremental backups, find the latest full backup as base
  let baseBackup: string | undefined = undefined;
  if (backupType === 'incremental') {
    const fullBackups = Array.from(allMetadata.values())
      .filter(m => m.type === 'full')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (fullBackups.length > 0) {
      baseBackup = fullBackups[0].filename;
    }
  }

  await execPromise(`pg_dump "${dbUrl}" -F c -f "${filepath}"`);
  
  const stats = fs.statSync(filepath);
  const metadata: BackupMetadata = {
    filename,
    createdAt: new Date().toISOString(),
    type: backupType,
    size: stats.size,
    description: `${manual ? 'يدوية' : 'تلقائية'} - ${backupType === 'incremental' ? 'جزئية' : 'كاملة'}`,
    baseBackup
  };

  // Store metadata
  allMetadata.set(filename, metadata);
  saveBackupMetadata(allMetadata);

  return { filename, createdAt: new Date().toISOString(), size: stats.size, type: backupType };
}

export async function restoreBackup(filename: string) {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) throw new Error("Backup file not found");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  try {
    await execPromise(`pg_restore --clean --if-exists --no-owner --no-privileges -d "${dbUrl}" "${filepath}"`);
  } catch (e: any) {
    console.warn("pg_restore finished with messages (often warnings):", e.message);
  }
}

export interface BackupInfo {
  filename: string;
  createdAt: string;
  size: number;
  type: string;
  backupType?: 'full' | 'incremental';
  description?: string;
}

export interface BackupFilters {
  type?: 'full' | 'incremental';
  sortBy?: 'date' | 'size' | 'name';
  search?: string;
  fromDate?: string;
  toDate?: string;
  minSize?: number;
  maxSize?: number;
}

export function listBackups(filters?: BackupFilters): BackupInfo[] {
  const metadata = getBackupMetadata();
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".dump"));
  
  const backups: BackupInfo[] = files.map(f => {
    const stats = fs.statSync(path.join(BACKUP_DIR, f));
    const meta = metadata.get(f);
    return {
      filename: f,
      createdAt: meta?.createdAt || stats.birthtime.toISOString(),
      size: stats.size,
      type: f.includes('manual') ? 'يدوي' : 'تلقائي',
      backupType: meta?.type || (f.includes('_inc_') ? 'incremental' : 'full'),
      description: meta?.description
    };
  });

  // Apply filters
  let filtered = backups;
  
  // Filter by type
  if (filters?.type) {
    filtered = filtered.filter(b => b.backupType === filters.type);
  }

  // Filter by search text
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(b => b.filename.toLowerCase().includes(searchLower));
  }

  // Filter by date range
  if (filters?.fromDate) {
    const fromDate = new Date(filters.fromDate).getTime();
    filtered = filtered.filter(b => new Date(b.createdAt).getTime() >= fromDate);
  }
  if (filters?.toDate) {
    const toDate = new Date(filters.toDate).getTime();
    filtered = filtered.filter(b => new Date(b.createdAt).getTime() <= toDate);
  }

  // Filter by size range (in bytes)
  if (filters?.minSize !== undefined) {
    filtered = filtered.filter(b => b.size >= filters.minSize!);
  }
  if (filters?.maxSize !== undefined) {
    filtered = filtered.filter(b => b.size <= filters.maxSize!);
  }

  // Apply sorting
  const sortBy = filters?.sortBy || 'date';
  switch (sortBy) {
    case 'size':
      filtered.sort((a, b) => b.size - a.size);
      break;
    case 'name':
      filtered.sort((a, b) => b.filename.localeCompare(a.filename));
      break;
    case 'date':
    default:
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return filtered;
}

export function deleteBackup(filename: string) {
  const filepath = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    
    // Remove metadata
    const metadata = getBackupMetadata();
    metadata.delete(filename);
    saveBackupMetadata(metadata);
  }
}

let backupIntervalTimer: NodeJS.Timeout | null = null;

export function scheduleAutoBackup() {
  if (backupIntervalTimer) {
    clearInterval(backupIntervalTimer);
    backupIntervalTimer = null;
  }
  
  const settings = getBackupSettings();
  if (settings.autoBackupEnabled && settings.intervalHours > 0) {
    const intervalMs = settings.intervalHours * 60 * 60 * 1000;
    backupIntervalTimer = setInterval(() => {
      const backupType = settings.autoBackupType || 'full';
      createBackup(false, backupType).catch(e => console.error("Auto backup failed:", e));
    }, intervalMs);
  }
}

scheduleAutoBackup();
