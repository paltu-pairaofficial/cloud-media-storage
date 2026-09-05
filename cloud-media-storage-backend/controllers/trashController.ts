import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db, UPLOADS_DIR } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getTrash(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const deletedFolders = await db.getAllUserFolders(userId, true);
  const deletedFiles = await db.getAllUserFiles(userId, true);

  res.json({
    folders: deletedFolders,
    files: deletedFiles,
  });
}

export async function restoreItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { type, id } = req.params; // type: 'file' | 'folder'

  if (type === 'folder') {
    const folder = await db.getFolderById(id);
    if (!folder || folder.userId !== userId || !folder.isDeleted) {
      res.status(404).json({ error: 'Deleted folder not found' });
      return;
    }

    // Check if parent folder still exists and is not deleted. If deleted, move to root
    let newParentId = folder.parentId;
    if (folder.parentId) {
      const parent = await db.getFolderById(folder.parentId);
      if (!parent || parent.isDeleted) {
        newParentId = null;
      }
    }

    const updated = await db.updateFolder(folder.id, {
      isDeleted: false,
      deletedAt: null,
      parentId: newParentId,
    });

    // Restore children if any
    const restoreDescendants = async (parentFolderId: string) => {
      const allDeletedFolders = await db.getAllUserFolders(userId, true);
      const subFolders = allDeletedFolders.filter((f) => f.parentId === parentFolderId);
      for (const sub of subFolders) {
        await db.updateFolder(sub.id, { isDeleted: false, deletedAt: null });
        await restoreDescendants(sub.id);
      }
      const allDeletedFiles = await db.getAllUserFiles(userId, true);
      const files = allDeletedFiles.filter((f) => f.folderId === parentFolderId);
      for (const file of files) {
        await db.updateFile(file.id, { isDeleted: false, deletedAt: null });
      }
    };
    await restoreDescendants(folder.id);

    await db.logActivity(userId, 'restore', 'folder', folder.id, folder.name);

    res.json({ message: 'Folder restored successfully', folder: updated || folder });
  } else {
    const file = await db.getFileById(id);
    if (!file || file.userId !== userId || !file.isDeleted) {
      res.status(404).json({ error: 'Deleted file not found' });
      return;
    }

    let newFolderId = file.folderId;
    if (file.folderId) {
      const parent = await db.getFolderById(file.folderId);
      if (!parent || parent.isDeleted) {
        newFolderId = null;
      }
    }

    const updated = await db.updateFile(file.id, {
      isDeleted: false,
      deletedAt: null,
      folderId: newFolderId,
    });

    await db.logActivity(userId, 'restore', 'file', file.id, file.name);

    res.json({ message: 'File restored successfully', file: updated || file });
  }
}

export async function deletePermanently(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { type, id } = req.params;

  if (type === 'folder') {
    const folder = await db.getFolderById(id);
    if (!folder || folder.userId !== userId) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }

    // Recursively collect all descendant folder IDs and file IDs
    const folderIdsToDelete = [id];
    const allUserFolders = [
      ...(await db.getAllUserFolders(userId, false)),
      ...(await db.getAllUserFolders(userId, true)),
    ];

    const collectChildren = (pId: string) => {
      const children = allUserFolders.filter((f) => f.parentId === pId);
      for (const child of children) {
        folderIdsToDelete.push(child.id);
        collectChildren(child.id);
      }
    };
    collectChildren(id);

    // Delete associated files from storage & db
    const allUserFiles = [
      ...(await db.getAllUserFiles(userId, false)),
      ...(await db.getAllUserFiles(userId, true)),
    ];
    const filesToDelete = allUserFiles.filter((f) => f.folderId && folderIdsToDelete.includes(f.folderId));

    for (const f of filesToDelete) {
      const filePath = path.join(UPLOADS_DIR, f.storagePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error('Failed to unlink file:', filePath, e);
        }
      }
      await db.deleteFilePermanently(f.id);
      await db.removeLinkShare('file', f.id);
      const shares = await db.getSharesByResource('file', f.id);
      for (const s of shares) {
        await db.removeShare(s.id);
      }
    }

    for (const fId of folderIdsToDelete) {
      await db.deleteFolderPermanently(fId);
      await db.removeLinkShare('folder', fId);
      const shares = await db.getSharesByResource('folder', fId);
      for (const s of shares) {
        await db.removeShare(s.id);
      }
    }

    res.json({ message: 'Folder and contents permanently deleted' });
  } else {
    const file = await db.getFileById(id);
    if (!file || file.userId !== userId) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, file.storagePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to unlink file:', filePath, e);
      }
    }

    await db.deleteFilePermanently(file.id);
    await db.removeLinkShare('file', file.id);
    const shares = await db.getSharesByResource('file', file.id);
    for (const s of shares) {
      await db.removeShare(s.id);
    }

    res.json({ message: 'File permanently deleted' });
  }
}

export async function emptyTrash(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const deletedFiles = await db.getAllUserFiles(userId, true);
  for (const file of deletedFiles) {
    const filePath = path.join(UPLOADS_DIR, file.storagePath);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // ignore
      }
    }
    await db.deleteFilePermanently(file.id);
    await db.removeLinkShare('file', file.id);
    const shares = await db.getSharesByResource('file', file.id);
    for (const s of shares) {
      await db.removeShare(s.id);
    }
  }

  const deletedFolders = await db.getAllUserFolders(userId, true);
  for (const folder of deletedFolders) {
    await db.deleteFolderPermanently(folder.id);
    await db.removeLinkShare('folder', folder.id);
    const shares = await db.getSharesByResource('folder', folder.id);
    for (const s of shares) {
      await db.removeShare(s.id);
    }
  }

  res.json({ message: 'Trash emptied successfully' });
}
