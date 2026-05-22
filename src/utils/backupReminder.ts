import dayjs from 'dayjs';

const firstSeenAtKey = 'youshu:firstSeenAt';
const lastBackupAtKey = 'youshu:lastBackupAt';
const dismissBackupReminderAtKey = 'youshu:dismissBackupReminderAt';
const backupReminderIntervalDays = 7;

export type BackupReminderMetadata = {
  firstSeenAt?: string;
  lastBackupAt?: string;
  dismissBackupReminderAt?: string;
};

export function getBackupReminderMetadata(): BackupReminderMetadata {
  return {
    firstSeenAt: readStorage(firstSeenAtKey),
    lastBackupAt: readStorage(lastBackupAtKey),
    dismissBackupReminderAt: readStorage(dismissBackupReminderAtKey),
  };
}

export function ensureFirstSeenAt(now = new Date()): string {
  const existingFirstSeenAt = readStorage(firstSeenAtKey);

  if (existingFirstSeenAt) {
    return existingFirstSeenAt;
  }

  const nextFirstSeenAt = now.toISOString();
  writeStorage(firstSeenAtKey, nextFirstSeenAt);
  return nextFirstSeenAt;
}

export function shouldShowBackupReminder(now = new Date()): boolean {
  const firstSeenAt = ensureFirstSeenAt(now);
  const lastBackupAt = readStorage(lastBackupAtKey);
  const dismissBackupReminderAt = readStorage(dismissBackupReminderAtKey);
  const today = dayjs(now).format('YYYY-MM-DD');

  if (dismissBackupReminderAt && dayjs(dismissBackupReminderAt).format('YYYY-MM-DD') === today) {
    return false;
  }

  const baseTime = lastBackupAt || firstSeenAt;
  return dayjs(now).diff(dayjs(baseTime), 'day') >= backupReminderIntervalDays;
}

export function markBackupExported(exportedAt = new Date().toISOString()): void {
  writeStorage(lastBackupAtKey, exportedAt);
}

export function dismissBackupReminder(now = new Date()): void {
  writeStorage(dismissBackupReminderAtKey, now.toISOString());
}

export function formatBackupTime(value?: string): string {
  if (!value) {
    return '尚未备份';
  }

  const date = dayjs(value);
  return date.isValid() ? `最近备份：${date.format('YYYY-MM-DD HH:mm')}` : '尚未备份';
}

function readStorage(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable in private or restricted contexts.
  }
}
