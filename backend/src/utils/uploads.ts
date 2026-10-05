import path from 'path';
import fs from 'fs';

/**
 * Returns candidate directories where uploaded attachments might be located
 */
export function getUploadCandidateDirs(): string[] {
  const dirs = [
    process.env.UPLOADS_DIR,
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'backend', 'uploads'),
    path.join(__dirname, '..', '..', 'uploads'),
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, 'uploads'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'UniManager', 'uploads') : null,
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'UniManager', 'uploads') : null,
  ].filter((d): d is string => Boolean(d));

  // Deduplicate entries
  return Array.from(new Set(dirs));
}

/**
 * Returns the primary writable directory for new uploads
 */
export function getPrimaryUploadDir(): string {
  if (process.env.UPLOADS_DIR) {
    if (!fs.existsSync(process.env.UPLOADS_DIR)) {
      try {
        fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });
      } catch (e) {
        console.warn('Failed to create UPLOADS_DIR:', e);
      }
    }
    return process.env.UPLOADS_DIR;
  }

  // If backend/uploads exists (e.g. dev structure)
  const backendUploads = path.join(process.cwd(), 'backend', 'uploads');
  if (fs.existsSync(backendUploads)) {
    return backendUploads;
  }

  // Default to process.cwd()/uploads
  const defaultUploads = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(defaultUploads)) {
    try {
      fs.mkdirSync(defaultUploads, { recursive: true });
    } catch (e) {
      console.warn('Failed to create default uploads directory:', e);
    }
  }
  return defaultUploads;
}

/**
 * Searches for a file across all potential upload directories
 */
export function findUploadedFile(filename: string): string | null {
  const safeFilename = path.basename(filename);
  const candidates = getUploadCandidateDirs();

  for (const dir of candidates) {
    const fullPath = path.join(dir, safeFilename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}
