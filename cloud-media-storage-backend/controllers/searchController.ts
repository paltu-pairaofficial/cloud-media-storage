import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function search(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  const type = (req.query.type as string) || 'all'; // all, image, video, audio, document, pdf, archive, code
  const sortBy = (req.query.sortBy as string) || 'name'; // name, date, size
  const sortOrder = (req.query.sortOrder as string) || 'asc';

  const allFiles = await db.getAllUserFiles(userId, false);
  const allFolders = await db.getAllUserFolders(userId, false);

  let userFiles = [...allFiles];
  let userFolders = [...allFolders];

  // Filter by query string
  if (q) {
    userFiles = userFiles.filter((f) => f.name.toLowerCase().includes(q));
    userFolders = userFolders.filter((f) => f.name.toLowerCase().includes(q));
  }

  // Filter by type
  if (type !== 'all') {
    userFolders = []; // type filter excludes folders
    if (type === 'image') {
      userFiles = userFiles.filter((f) => f.mimeType.startsWith('image/'));
    } else if (type === 'video') {
      userFiles = userFiles.filter((f) => f.mimeType.startsWith('video/'));
    } else if (type === 'audio') {
      userFiles = userFiles.filter((f) => f.mimeType.startsWith('audio/'));
    } else if (type === 'pdf') {
      userFiles = userFiles.filter((f) => f.mimeType === 'application/pdf' || f.name.endsWith('.pdf'));
    } else if (type === 'document') {
      userFiles = userFiles.filter(
        (f) =>
          f.mimeType.includes('document') ||
          f.mimeType.includes('text') ||
          f.mimeType.includes('msword') ||
          f.mimeType.includes('presentation') ||
          f.mimeType.includes('sheet') ||
          /\.(docx?|xlsx?|pptx?|txt|md|csv)$/i.test(f.name)
      );
    } else if (type === 'code') {
      userFiles = userFiles.filter(
        (f) =>
          f.mimeType.includes('json') ||
          f.mimeType.includes('javascript') ||
          f.mimeType.includes('typescript') ||
          f.mimeType.includes('html') ||
          f.mimeType.includes('xml') ||
          /\.(js|ts|jsx|tsx|json|html|css|py|java|c|cpp|go|rs|sh|sql)$/i.test(f.name)
      );
    } else if (type === 'archive') {
      userFiles = userFiles.filter(
        (f) =>
          f.mimeType.includes('zip') ||
          f.mimeType.includes('tar') ||
          f.mimeType.includes('rar') ||
          f.mimeType.includes('7z') ||
          /\.(zip|tar|gz|rar|7z)$/i.test(f.name)
      );
    }
  }

  // Sort files
  userFiles.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'date') {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    } else if (sortBy === 'size') {
      comparison = a.size - b.size;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Sort folders
  userFolders.sort((a, b) => {
    let comparison = a.name.localeCompare(b.name);
    if (sortBy === 'date') {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  res.json({
    files: userFiles,
    folders: userFolders,
    totalCount: userFiles.length + userFolders.length,
  });
}
