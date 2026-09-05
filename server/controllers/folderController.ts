import { Response } from 'express';
import crypto from 'crypto';
import { db, Folder } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Helper to check folder access asynchronously
export async function canAccessFolder(
  userId: string,
  folderId: string,
  requiredRole: 'viewer' | 'editor' = 'viewer'
): Promise<boolean> {
  const folder = await db.getFolderById(folderId);
  if (!folder) return false;
  if (folder.userId === userId) return true;

  // Check direct shares
  const shares = await db.getSharesByResource('folder', folderId);
  const directShare = shares.find((s) => s.sharedWithUserId === userId);
  if (directShare) {
    if (requiredRole === 'viewer') return true;
    return directShare.role === 'editor';
  }

  // Check parent folder shares recursively
  if (folder.parentId) {
    return canAccessFolder(userId, folder.parentId, requiredRole);
  }

  return false;
}

export async function getFolders(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const parentId = req.query.parentId === 'root' || !req.query.parentId ? null : (req.query.parentId as string);

  let targetUserId = userId;
  if (parentId) {
    const parentFolder = await db.getFolderById(parentId);
    if (!parentFolder || parentFolder.isDeleted) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    const hasAccess = await canAccessFolder(userId, parentId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Permission denied' });
      return;
    }
    targetUserId = parentFolder.userId;
  }

  // Active (not deleted) folders for current parent
  const folders = await db.getFoldersByUser(targetUserId, parentId, false);
  const allUserFolders = await db.getAllUserFolders(targetUserId, false);
  const allUserFiles = await db.getAllUserFiles(targetUserId, false);

  // Augment with item counts
  const foldersWithCounts = folders.map((folder) => {
    const subFolderCount = allUserFolders.filter((f) => f.parentId === folder.id).length;
    const fileCount = allUserFiles.filter((f) => f.folderId === folder.id).length;
    return {
      ...folder,
      itemCount: subFolderCount + fileCount,
      subFolderCount,
      fileCount,
    };
  });

  res.json({ folders: foldersWithCounts });
}

export async function getFolderTree(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const allFolders = await db.getAllUserFolders(userId, false);

  res.json({ folders: allFolders });
}

export async function getFolderDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  if (id === 'root') {
    res.json({
      folder: {
        id: 'root',
        name: 'My Drive',
        parentId: null,
      },
      breadcrumbs: [{ id: 'root', name: 'My Drive' }],
    });
    return;
  }

  const folder = await db.getFolderById(id);
  if (!folder || folder.isDeleted) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const hasAccess = await canAccessFolder(userId, folder.id);
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied' });
    return;
  }

  // Build breadcrumbs path
  const breadcrumbs: { id: string; name: string }[] = [];
  let curr: Folder | null = folder;
  while (curr) {
    breadcrumbs.unshift({ id: curr.id, name: curr.name });
    if (curr.parentId) {
      curr = await db.getFolderById(curr.parentId);
    } else {
      break;
    }
  }
  breadcrumbs.unshift({ id: 'root', name: 'My Drive' });

  res.json({ folder, breadcrumbs });
}

export async function createFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, parentId, color } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Folder name is required' });
    return;
  }

  const cleanParentId = parentId === 'root' || !parentId ? null : parentId;

  if (cleanParentId) {
    const parentAllowed = await canAccessFolder(userId, cleanParentId, 'editor');
    if (!parentAllowed) {
      res.status(403).json({ error: 'Permission denied to create folder in target directory' });
      return;
    }
  }

  const now = new Date().toISOString();
  const newFolder: Folder = {
    id: 'fld_' + crypto.randomBytes(6).toString('hex'),
    name: name.trim(),
    parentId: cleanParentId,
    userId,
    isStarred: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    color: color || '#3b82f6',
  };

  await db.createFolder(newFolder);
  await db.logActivity(userId, 'create_folder', 'folder', newFolder.id, newFolder.name);

  res.status(201).json({ folder: newFolder });
}

export async function renameFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'New folder name is required' });
    return;
  }

  const folder = await db.getFolderById(id);
  if (!folder || folder.isDeleted) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const hasAccess = await canAccessFolder(userId, folder.id, 'editor');
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied to rename this folder' });
    return;
  }

  const oldName = folder.name;
  const updated = await db.updateFolder(folder.id, {
    name: name.trim(),
  });

  await db.logActivity(userId, 'rename', 'folder', folder.id, name.trim(), `Renamed from "${oldName}"`);

  res.json({ folder: updated || folder });
}

export async function moveFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { targetParentId } = req.body;

  const folder = await db.getFolderById(id);
  if (!folder || folder.isDeleted) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const hasAccess = await canAccessFolder(userId, folder.id, 'editor');
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied to move this folder' });
    return;
  }

  const cleanTargetId = targetParentId === 'root' || !targetParentId ? null : targetParentId;

  // Prevent moving into itself
  if (cleanTargetId === folder.id) {
    res.status(400).json({ error: 'Cannot move folder into itself' });
    return;
  }

  if (cleanTargetId) {
    let check: Folder | null = await db.getFolderById(cleanTargetId);
    while (check) {
      if (check.parentId === folder.id) {
        res.status(400).json({ error: 'Cannot move a folder into one of its subfolders' });
        return;
      }
      check = check.parentId ? await db.getFolderById(check.parentId) : null;
    }
  }

  const updated = await db.updateFolder(folder.id, {
    parentId: cleanTargetId,
  });

  await db.logActivity(userId, 'move', 'folder', folder.id, folder.name);

  res.json({ folder: updated || folder });
}

export async function toggleStarFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const folder = await db.getFolderById(id);
  if (!folder || folder.isDeleted) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const updated = await db.updateFolder(folder.id, {
    isStarred: !folder.isStarred,
  });

  const isStarredNow = !folder.isStarred;
  await db.logActivity(userId, 'star', 'folder', folder.id, folder.name, isStarredNow ? 'Starred' : 'Unstarred');

  res.json({ folder: updated || folder });
}

export async function deleteFolder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const folder = await db.getFolderById(id);
  if (!folder || folder.isDeleted) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const hasAccess = await canAccessFolder(userId, folder.id, 'editor');
  if (!hasAccess) {
    res.status(403).json({ error: 'Permission denied to delete this folder' });
    return;
  }

  const now = new Date().toISOString();
  const updatedFolder = await db.updateFolder(folder.id, {
    isDeleted: true,
    deletedAt: now,
  });

  // Soft delete all descendant folders & files
  const markDescendantsDeleted = async (parentFolderId: string) => {
    const subFolders = (await db.getAllUserFolders(userId, false)).filter((f) => f.parentId === parentFolderId);
    for (const sub of subFolders) {
      await db.updateFolder(sub.id, { isDeleted: true, deletedAt: now });
      await markDescendantsDeleted(sub.id);
    }
    const files = (await db.getAllUserFiles(userId, false)).filter((f) => f.folderId === parentFolderId);
    for (const file of files) {
      await db.updateFile(file.id, { isDeleted: true, deletedAt: now });
    }
  };

  await markDescendantsDeleted(folder.id);
  await db.logActivity(userId, 'delete', 'folder', folder.id, folder.name, 'Moved to Trash');

  res.json({ message: 'Folder moved to trash', folder: updatedFolder || folder });
}
