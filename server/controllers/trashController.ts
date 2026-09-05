import { Response } from 'express';
import { db, supabase } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

function requireStorage() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  if (!STORAGE_BUCKET) {
    throw new Error('SUPABASE_STORAGE_BUCKET is not configured');
  }

  return {
    client: supabase,
    bucket: STORAGE_BUCKET,
  };
}

async function deleteStorageObject(storagePath: string): Promise<void> {
  const { client, bucket } = requireStorage();

  if (!storagePath) {
    return;
  }

  const { error } = await client.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw new Error(
      `Supabase Storage delete failed: ${error.message}`
    );
  }
}

export async function getTrash(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    const deletedFolders = await db.getAllUserFolders(userId, true);
    const deletedFiles = await db.getAllUserFiles(userId, true);

    res.json({
      folders: deletedFolders,
      files: deletedFiles,
    });
  } catch (error) {
    console.error('Get trash error:', error);

    res.status(500).json({
      error: 'Failed to retrieve trash',
    });
  }
}

export async function restoreItem(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { type, id } = req.params;

    if (type === 'folder') {
      const folder = await db.getFolderById(id);

      if (
        !folder ||
        folder.userId !== userId ||
        !folder.isDeleted
      ) {
        res.status(404).json({
          error: 'Deleted folder not found',
        });
        return;
      }

      // If the original parent no longer exists or is deleted,
      // restore the folder to the root.
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

      // Restore all descendants.
      const restoreDescendants = async (
        parentFolderId: string
      ): Promise<void> => {
        const allDeletedFolders =
          await db.getAllUserFolders(userId, true);

        const subFolders = allDeletedFolders.filter(
          (f) => f.parentId === parentFolderId
        );

        for (const sub of subFolders) {
          await db.updateFolder(sub.id, {
            isDeleted: false,
            deletedAt: null,
          });

          await restoreDescendants(sub.id);
        }

        const allDeletedFiles =
          await db.getAllUserFiles(userId, true);

        const files = allDeletedFiles.filter(
          (f) => f.folderId === parentFolderId
        );

        for (const file of files) {
          await db.updateFile(file.id, {
            isDeleted: false,
            deletedAt: null,
          });
        }
      };

      await restoreDescendants(folder.id);

      await db.logActivity(
        userId,
        'restore',
        'folder',
        folder.id,
        folder.name
      );

      res.json({
        message: 'Folder restored successfully',
        folder: updated || folder,
      });

      return;
    }

    if (type === 'file') {
      const file = await db.getFileById(id);

      if (
        !file ||
        file.userId !== userId ||
        !file.isDeleted
      ) {
        res.status(404).json({
          error: 'Deleted file not found',
        });
        return;
      }

      // If the original folder no longer exists or is deleted,
      // restore the file to the root.
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

      await db.logActivity(
        userId,
        'restore',
        'file',
        file.id,
        file.name
      );

      res.json({
        message: 'File restored successfully',
        file: updated || file,
      });

      return;
    }

    res.status(400).json({
      error: 'Invalid trash item type',
    });
  } catch (error) {
    console.error('Restore item error:', error);

    res.status(500).json({
      error: 'Failed to restore item',
    });
  }
}

export async function deletePermanently(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { type, id } = req.params;

    // ============================================================
    // PERMANENTLY DELETE FOLDER
    // ============================================================

    if (type === 'folder') {
      const folder = await db.getFolderById(id);

      if (!folder || folder.userId !== userId) {
        res.status(404).json({
          error: 'Folder not found',
        });
        return;
      }

      // Collect this folder and every descendant folder.
      const folderIdsToDelete = [id];

      const allUserFolders = [
        ...(await db.getAllUserFolders(userId, false)),
        ...(await db.getAllUserFolders(userId, true)),
      ];

      const collectChildren = (parentFolderId: string): void => {
        const children = allUserFolders.filter(
          (f) => f.parentId === parentFolderId
        );

        for (const child of children) {
          folderIdsToDelete.push(child.id);
          collectChildren(child.id);
        }
      };

      collectChildren(id);

      // Find all files belonging to those folders.
      const allUserFiles = [
        ...(await db.getAllUserFiles(userId, false)),
        ...(await db.getAllUserFiles(userId, true)),
      ];

      const filesToDelete = allUserFiles.filter(
        (file) =>
          file.folderId &&
          folderIdsToDelete.includes(file.folderId)
      );

      // Delete actual file objects from Supabase Storage first.
      for (const file of filesToDelete) {
        await deleteStorageObject(file.storagePath);

        await db.deleteFilePermanently(file.id);

        await db.removeLinkShare('file', file.id);

        const shares = await db.getSharesByResource(
          'file',
          file.id
        );

        for (const share of shares) {
          await db.removeShare(share.id);
        }
      }

      // Delete the folders from the database.
      for (const folderId of folderIdsToDelete) {
        await db.deleteFolderPermanently(folderId);

        await db.removeLinkShare(
          'folder',
          folderId
        );

        const shares = await db.getSharesByResource(
          'folder',
          folderId
        );

        for (const share of shares) {
          await db.removeShare(share.id);
        }
      }

      res.json({
        message:
          'Folder and contents permanently deleted',
      });

      return;
    }

    // ============================================================
    // PERMANENTLY DELETE FILE
    // ============================================================

    if (type === 'file') {
      const file = await db.getFileById(id);

      if (!file || file.userId !== userId) {
        res.status(404).json({
          error: 'File not found',
        });
        return;
      }

      // Delete the actual file from Supabase Storage.
      await deleteStorageObject(file.storagePath);

      // Then delete the database metadata.
      await db.deleteFilePermanently(file.id);

      // Remove public link sharing.
      await db.removeLinkShare(
        'file',
        file.id
      );

      // Remove normal shares.
      const shares = await db.getSharesByResource(
        'file',
        file.id
      );

      for (const share of shares) {
        await db.removeShare(share.id);
      }

      res.json({
        message: 'File permanently deleted',
      });

      return;
    }

    res.status(400).json({
      error: 'Invalid trash item type',
    });
  } catch (error) {
    console.error(
      'Permanent delete error:',
      error
    );

    res.status(500).json({
      error:
        'Failed to permanently delete item',
    });
  }
}

export async function emptyTrash(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    // ============================================================
    // DELETE ALL TRASHED FILES
    // ============================================================

    const deletedFiles =
      await db.getAllUserFiles(userId, true);

    for (const file of deletedFiles) {
      // Delete actual file from Supabase Storage.
      await deleteStorageObject(
        file.storagePath
      );

      // Delete database metadata.
      await db.deleteFilePermanently(file.id);

      // Remove public link.
      await db.removeLinkShare(
        'file',
        file.id
      );

      // Remove normal shares.
      const shares = await db.getSharesByResource(
        'file',
        file.id
      );

      for (const share of shares) {
        await db.removeShare(share.id);
      }
    }

    // ============================================================
    // DELETE ALL TRASHED FOLDERS
    // ============================================================

    const deletedFolders =
      await db.getAllUserFolders(userId, true);

    for (const folder of deletedFolders) {
      await db.deleteFolderPermanently(
        folder.id
      );

      await db.removeLinkShare(
        'folder',
        folder.id
      );

      const shares = await db.getSharesByResource(
        'folder',
        folder.id
      );

      for (const share of shares) {
        await db.removeShare(share.id);
      }
    }

    res.json({
      message: 'Trash emptied successfully',
    });
  } catch (error) {
    console.error(
      'Empty trash error:',
      error
    );

    res.status(500).json({
      error: 'Failed to empty trash',
    });
  }
}