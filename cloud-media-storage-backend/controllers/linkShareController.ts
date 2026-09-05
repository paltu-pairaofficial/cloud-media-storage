import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, LinkShare, UPLOADS_DIR } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function createOrUpdateLinkShare(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { resourceType, resourceId, role, allowDownload } = req.body;

  if (!resourceType || !resourceId) {
    res.status(400).json({ error: 'resourceType and resourceId are required' });
    return;
  }

  // Check ownership
  if (resourceType === 'file') {
    const file = await db.getFileById(resourceId);
    if (!file || file.isDeleted || file.userId !== userId) {
      res.status(403).json({ error: 'Only the resource owner can generate public links' });
      return;
    }
  } else {
    const folder = await db.getFolderById(resourceId);
    if (!folder || folder.isDeleted || folder.userId !== userId) {
      res.status(403).json({ error: 'Only the resource owner can generate public links' });
      return;
    }
  }

  let linkShare = await db.getLinkShareByResource(resourceType, resourceId);

  if (linkShare) {
    linkShare.role = role === 'editor' ? 'editor' : 'viewer';
    linkShare.allowDownload = allowDownload !== false;
    linkShare = await db.createOrUpdateLinkShare(linkShare);
  } else {
    const newLink: LinkShare = {
      id: 'lnk_' + crypto.randomBytes(6).toString('hex'),
      resourceType,
      resourceId,
      ownerId: userId,
      token: crypto.randomBytes(16).toString('hex'),
      role: role === 'editor' ? 'editor' : 'viewer',
      allowDownload: allowDownload !== false,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    };
    linkShare = await db.createOrUpdateLinkShare(newLink);
  }

  res.json({ linkShare });
}

export async function getLinkShare(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { resourceType, resourceId } = req.params;
  const linkShare = await db.getLinkShareByResource(resourceType as 'file' | 'folder', resourceId);
  res.json({ linkShare: linkShare || null });
}

export async function removeLinkShare(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { resourceType, resourceId } = req.params;

  const linkShare = await db.getLinkShareByResource(resourceType as 'file' | 'folder', resourceId);
  if (!linkShare || linkShare.ownerId !== userId) {
    res.status(404).json({ error: 'Link share not found or permission denied' });
    return;
  }

  await db.removeLinkShare(resourceType as 'file' | 'folder', resourceId);

  res.json({ message: 'Public link removed' });
}

// Public access endpoint (Unauthenticated)
export async function getPublicResource(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  const link = await db.getLinkShareByToken(token);
  if (!link) {
    res.status(404).json({ error: 'Invalid or expired share link' });
    return;
  }

  const owner = await db.getUserById(link.ownerId);

  if (link.resourceType === 'file') {
    const file = await db.getFileById(link.resourceId);
    if (!file || file.isDeleted) {
      res.status(404).json({ error: 'The shared file was deleted or is no longer available' });
      return;
    }

    res.json({
      linkShare: {
        role: link.role,
        allowDownload: link.allowDownload,
        createdAt: link.createdAt,
      },
      resourceType: 'file',
      file,
      owner: owner ? { name: owner.name, avatarColor: owner.avatarColor } : null,
    });
  } else {
    const folder = await db.getFolderById(link.resourceId);
    if (!folder || folder.isDeleted) {
      res.status(404).json({ error: 'The shared folder was deleted or is no longer available' });
      return;
    }

    // Children of folder
    const allUserFolders = await db.getAllUserFolders(folder.userId, false);
    const allUserFiles = await db.getAllUserFiles(folder.userId, false);

    const childFolders = allUserFolders.filter((f) => f.parentId === folder.id);
    const childFiles = allUserFiles.filter((f) => f.folderId === folder.id);

    res.json({
      linkShare: {
        role: link.role,
        allowDownload: link.allowDownload,
        createdAt: link.createdAt,
      },
      resourceType: 'folder',
      folder,
      files: childFiles,
      folders: childFolders,
      owner: owner ? { name: owner.name, avatarColor: owner.avatarColor } : null,
    });
  }
}

export async function downloadPublicFile(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  const link = await db.getLinkShareByToken(token);
  if (!link) {
    res.status(404).json({ error: 'Invalid link' });
    return;
  }

  if (!link.allowDownload) {
    res.status(403).json({ error: 'Downloads are disabled by the owner for this shared link' });
    return;
  }

  const file = await db.getFileById(link.resourceId);
  if (!file || file.isDeleted) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, file.storagePath);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File data missing' });
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
}
