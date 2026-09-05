import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, FileItem, UPLOADS_DIR } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { canAccessFolder } from './folderController.js';

export async function canAccessFile(
  userId: string,
  fileId: string,
  requiredRole: 'viewer' | 'editor' = 'viewer'
): Promise<boolean> {
  const file = await db.getFileById(fileId);
  if (!file) return false;
  if (file.userId === userId) return true;

  // Direct share
  const shares = await db.getSharesByResource('file', fileId);
  const directShare = shares.find((s) => s.sharedWithUserId === userId);
  if (directShare) {
    if (requiredRole === 'viewer') return true;
    return directShare.role === 'editor';
  }

  // Check parent folder share
  if (file.folderId) {
    return canAccessFolder(userId, file.folderId, requiredRole);
  }

  return false;
}

export async function uploadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const folderIdRaw = req.body.folderId;
  const folderId = folderIdRaw === 'root' || !folderIdRaw ? null : folderIdRaw;

  let ownerUserId = userId;
  if (folderId) {
    const parentFolder = await db.getFolderById(folderId);
    if (!parentFolder || parentFolder.isDeleted) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    const hasFolderAccess = await canAccessFolder(userId, folderId, 'editor');
    if (!hasFolderAccess) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      res.status(403).json({ error: 'Permission denied to upload to target folder' });
      return;
    }
    ownerUserId = parentFolder.userId;
  }

  const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
  const now = new Date().toISOString();
  const ext = path.extname(originalName).replace('.', '').toLowerCase();

  const newFile: FileItem = {
    id: 'fil_' + crypto.randomBytes(6).toString('hex'),
    name: originalName,
    originalName: originalName,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size,
    storagePath: file.filename,
    folderId,
    userId: ownerUserId,
    isStarred: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    metadata: {
      extension: ext,
    },
  };

  await db.createFile(newFile);
  await db.logActivity(userId, 'upload', 'file', newFile.id, newFile.name);

  res.status(201).json({ file: newFile });
}

export async function getFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const folderId = req.query.folderId === 'root' || !req.query.folderId ? null : (req.query.folderId as string);

  let targetUserId = userId;
  if (folderId) {
    const parentFolder = await db.getFolderById(folderId);
    if (!parentFolder || parentFolder.isDeleted) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    const hasAccess = await canAccessFolder(userId, folderId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
    targetUserId = parentFolder.userId;
  }

  const files = await db.getFilesByUser(targetUserId, folderId, false);

  res.json({ files });
}

export async function getFileById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const file = await db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const hasAccess = await canAccessFile(userId, file.id);
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied' });
    return;
  }

  // Owner details
  const owner = await db.getUserById(file.userId);

  // Shares info
  const shares = await db.getSharesByResource('file', file.id);
  const linkShare = await db.getLinkShareByResource('file', file.id);

  res.json({
    file,
    owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
    shares,
    linkShare,
  });
}

export async function downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { id } = req.params;

  const file = await db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (userId) {
    const hasAccess = await canAccessFile(userId, file.id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
  }

  const filePath = path.join(UPLOADS_DIR, file.storagePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File data missing from storage' });
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}

export async function streamFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.id;
  const { id } = req.params;

  const file = await db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  if (userId) {
    const hasAccess = await canAccessFile(userId, file.id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
  }

  const filePath = path.join(UPLOADS_DIR, file.storagePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File content not found' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.mimeType || 'application/octet-stream',
    });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

export async function getFileTextContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const file = await db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const hasAccess = await canAccessFile(userId, file.id);
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, file.storagePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File content not found' });
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    res.status(400).json({ error: 'File is too large for inline text viewing (limit 2MB)' });
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content, mimeType: file.mimeType, name: file.name });
  } catch (err) {
    res.status(500).json({ error: 'Could not read text file' });
  }
}

export async function renameFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'File name is required' });
    return;
  }

  const file = await db.getFileById(id);
  if (!file || file.isDeleted) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const hasAccess = await canAccessFile(userId, file.id, 'editor');
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied to rename this file' });
    return;
  }

  const oldName = file.name;
  const newName = name.trim();
  const ext = path.extname(newName).replace('.', '').toLowerCase();

  const updated = await db.updateFile(file.id, {
    name: newName,
    metadata: {
      ...(file.metadata || {}),
      extension: ext,
    },
  });

  await db.logActivity(userId, 'rename', 'file', file.id, newName, `Renamed from "${oldName}"`);

  res.json({ file: updated || file });
}

export async function moveFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { targetFolderId } = req.body;

  const file = await db.getFileById(id);
  if (!file || file.isDeleted) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const hasAccess = await canAccessFile(userId, file.id, 'editor');
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied to move this file' });
    return;
  }

  const cleanTargetId = targetFolderId === 'root' || !targetFolderId ? null : targetFolderId;

  if (cleanTargetId) {
    const parentAllowed = await canAccessFolder(userId, cleanTargetId, 'editor');
    if (!parentAllowed) {
      res.status(403).json({ error: 'Permission denied to target destination folder' });
      return;
    }
  }

  const updated = await db.updateFile(file.id, {
    folderId: cleanTargetId,
  });

  await db.logActivity(userId, 'move', 'file', file.id, file.name);

  res.json({ file: updated || file });
}

export async function toggleStarFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const file = await db.getFileById(id);
  if (!file || file.isDeleted) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const updated = await db.updateFile(file.id, {
    isStarred: !file.isStarred,
  });

  const isStarredNow = !file.isStarred;
  await db.logActivity(userId, 'star', 'file', file.id, file.name, isStarredNow ? 'Starred' : 'Unstarred');

  res.json({ file: updated || file });
}

export async function deleteFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const file = await db.getFileById(id);
  if (!file || file.isDeleted) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const hasAccess = await canAccessFile(userId, file.id, 'editor');
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied to delete this file' });
    return;
  }

  const updated = await db.updateFile(file.id, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });

  await db.logActivity(userId, 'delete', 'file', file.id, file.name, 'Moved to Trash');

  res.json({ message: 'File moved to trash', file: updated || file });
}
