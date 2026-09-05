import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getStorageStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const userFiles = await db.getAllUserFiles(userId, false);
  const userFolders = await db.getAllUserFolders(userId, false);

  let totalBytes = 0;
  let imagesBytes = 0;
  let videosBytes = 0;
  let audioBytes = 0;
  let docsBytes = 0;
  let othersBytes = 0;

  for (const f of userFiles) {
    totalBytes += f.size;
    const m = f.mimeType.toLowerCase();
    if (m.startsWith('image/')) {
      imagesBytes += f.size;
    } else if (m.startsWith('video/')) {
      videosBytes += f.size;
    } else if (m.startsWith('audio/')) {
      audioBytes += f.size;
    } else if (
      m.includes('pdf') ||
      m.includes('document') ||
      m.includes('text') ||
      m.includes('msword') ||
      m.includes('presentation') ||
      m.includes('sheet')
    ) {
      docsBytes += f.size;
    } else {
      othersBytes += f.size;
    }
  }

  const storageQuotaBytes = 1 * 1024 * 1024 * 1024; // 1 GB quota
  const percentage = Math.min(100, Math.round((totalBytes / storageQuotaBytes) * 1000) / 10);

  res.json({
    totalBytes,
    totalCount: userFiles.length,
    folderCount: userFolders.length,
    storageQuotaBytes,
    percentage,
    breakdown: {
      images: imagesBytes,
      videos: videosBytes,
      audio: audioBytes,
      documents: docsBytes,
      others: othersBytes,
    },
  });
}
