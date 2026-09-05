import { Response } from 'express';
import crypto from 'crypto';
import { db, Share } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function shareResource(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { resourceType, resourceId, email, role } = req.body;

  if (!resourceType || !resourceId || !email) {
    res.status(400).json({ error: 'resourceType, resourceId, and email are required' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find recipient user
  const targetUser = await db.getUserByEmail(normalizedEmail);
  if (!targetUser) {
    res.status(404).json({ error: `User with email "${normalizedEmail}" was not found.` });
    return;
  }

  if (targetUser.id === userId) {
    res.status(400).json({ error: 'You cannot share a resource with yourself' });
    return;
  }

  // Verify ownership & resource status
  let resourceName = 'Resource';
  if (resourceType === 'file') {
    const file = await db.getFileById(resourceId);
    if (!file || file.isDeleted || file.userId !== userId) {
      res.status(403).json({ error: 'Only the owner can manage permissions for this file' });
      return;
    }
    resourceName = file.name;
  } else {
    const folder = await db.getFolderById(resourceId);
    if (!folder || folder.isDeleted || folder.userId !== userId) {
      res.status(403).json({ error: 'Only the owner can manage permissions for this folder' });
      return;
    }
    resourceName = folder.name;
  }

  // Check if existing share
  const existingShares = await db.getSharesByResource(resourceType, resourceId);
  const existingShare = existingShares.find((s) => s.sharedWithUserId === targetUser.id);

  const selectedRole = role === 'editor' ? 'editor' : 'viewer';
  let savedShare: Share;

  if (existingShare) {
    existingShare.role = selectedRole;
    savedShare = await db.createOrUpdateShare(existingShare);
  } else {
    const newShare: Share = {
      id: 'shr_' + crypto.randomBytes(6).toString('hex'),
      resourceType,
      resourceId,
      ownerId: userId,
      sharedWithUserId: targetUser.id,
      sharedWithEmail: targetUser.email,
      role: selectedRole,
      createdAt: new Date().toISOString(),
    };
    savedShare = await db.createOrUpdateShare(newShare);
  }

  await db.logActivity(
    userId,
    'share',
    resourceType,
    resourceId,
    resourceName,
    `Shared with ${targetUser.name} (${selectedRole})`
  );

  res.status(200).json({
    message: 'Access granted successfully',
    share: {
      ...savedShare,
      userName: targetUser.name,
      userAvatarColor: targetUser.avatarColor,
    },
  });
}

export async function getResourceShares(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { resourceType, resourceId } = req.params;

  let resourceOwnerId = '';
  if (resourceType === 'file') {
    const file = await db.getFileById(resourceId);
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    resourceOwnerId = file.userId;
  } else {
    const folder = await db.getFolderById(resourceId);
    if (!folder) {
      res.status(404).json({ error: 'Folder not found' });
      return;
    }
    resourceOwnerId = folder.userId;
  }

  const owner = await db.getUserById(resourceOwnerId);
  const shares = await db.getSharesByResource(resourceType as 'file' | 'folder', resourceId);

  const augmentedShares = await Promise.all(
    shares.map(async (s) => {
      const u = s.sharedWithUserId ? await db.getUserById(s.sharedWithUserId) : null;
      return {
        ...s,
        userName: u?.name || s.sharedWithEmail,
        userAvatarColor: u?.avatarColor || '#64748b',
      };
    })
  );

  res.json({
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          avatarColor: owner.avatarColor,
        }
      : null,
    shares: augmentedShares,
    isOwner: resourceOwnerId === userId,
  });
}

export async function updateShareRole(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { shareId } = req.params;
  const { role } = req.body;

  const share = await db.getShareById(shareId);
  if (!share) {
    res.status(404).json({ error: 'Share record not found' });
    return;
  }

  if (share.ownerId !== userId) {
    res.status(403).json({ error: 'Only the resource owner can change permissions' });
    return;
  }

  share.role = role === 'editor' ? 'editor' : 'viewer';
  const updated = await db.createOrUpdateShare(share);

  res.json({ share: updated });
}

export async function removeShare(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { shareId } = req.params;

  const share = await db.getShareById(shareId);
  if (!share) {
    res.status(404).json({ error: 'Share record not found' });
    return;
  }

  if (share.ownerId !== userId && share.sharedWithUserId !== userId) {
    res.status(403).json({ error: 'Permission denied to revoke access' });
    return;
  }

  await db.removeShare(share.id);

  res.json({ message: 'Access removed successfully' });
}

export async function getSharedWithMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const userShares = await db.getSharesForUser(userId);

  const sharedFiles: any[] = [];
  const sharedFolders: any[] = [];

  for (const s of userShares) {
    if (s.resourceType === 'file') {
      const file = await db.getFileById(s.resourceId);
      if (file && !file.isDeleted) {
        const owner = await db.getUserById(file.userId);
        sharedFiles.push({
          ...file,
          sharedRole: s.role,
          sharedAt: s.createdAt,
          ownerName: owner?.name || 'Unknown',
          ownerEmail: owner?.email || '',
        });
      }
    } else {
      const folder = await db.getFolderById(s.resourceId);
      if (folder && !folder.isDeleted) {
        const owner = await db.getUserById(folder.userId);
        sharedFolders.push({
          ...folder,
          sharedRole: s.role,
          sharedAt: s.createdAt,
          ownerName: owner?.name || 'Unknown',
          ownerEmail: owner?.email || '',
        });
      }
    }
  }

  res.json({
    files: sharedFiles,
    folders: sharedFolders,
  });
}
