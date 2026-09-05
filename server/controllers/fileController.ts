import { Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { db, FileItem, supabase } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { canAccessFolder } from './folderController.js';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

function requireStorage(): {
  client: NonNullable<typeof supabase>;
  bucket: string;
} {
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

function encodeDownloadFilename(name: string): string {
  return encodeURIComponent(name).replace(/%20/g, ' ');
}

function getSafeStoragePath(userId: string, fileId: string, originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();
  const randomPart = crypto.randomBytes(12).toString('hex');

  return `${userId}/${fileId}-${Date.now()}-${randomPart}${extension}`;
}

async function downloadStorageObject(storagePath: string): Promise<Buffer> {
  const { client, bucket } = requireStorage();

  const { data, error } = await client.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    throw new Error(`Storage download failed: ${error.message}`);
  }

  if (!data) {
    throw new Error('Storage returned no file data');
  }

  return Buffer.from(await data.arrayBuffer());
}

async function deleteStorageObject(storagePath: string): Promise<void> {
  const { client, bucket } = requireStorage();

  const { error } = await client.storage
    .from(bucket)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

export async function canAccessFile(
  userId: string,
  fileId: string,
  requiredRole: 'viewer' | 'editor' = 'viewer'
): Promise<boolean> {
  const file = await db.getFileById(fileId);

  if (!file) {
    return false;
  }

  if (file.userId === userId) {
    return true;
  }

  const shares = await db.getSharesByResource('file', fileId);

  const directShare = shares.find(
    (s) => s.sharedWithUserId === userId
  );

  if (directShare) {
    if (requiredRole === 'viewer') {
      return true;
    }

    return directShare.role === 'editor';
  }

  if (file.folderId) {
    return canAccessFolder(userId, file.folderId, requiredRole);
  }

  return false;
}

export async function uploadFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!file.buffer) {
      res.status(400).json({
        error: 'Upload buffer is unavailable. Configure multer to use memoryStorage().',
      });
      return;
    }

    const folderIdRaw = req.body.folderId;
    const folderId =
      folderIdRaw === 'root' || !folderIdRaw ? null : folderIdRaw;

    let ownerUserId = userId;

    if (folderId) {
      const parentFolder = await db.getFolderById(folderId);

      if (!parentFolder || parentFolder.isDeleted) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }

      const hasFolderAccess = await canAccessFolder(
        userId,
        folderId,
        'editor'
      );

      if (!hasFolderAccess) {
        res.status(403).json({
          error: 'Permission denied to upload to target folder',
        });
        return;
      }

      ownerUserId = parentFolder.userId;
    }

    const originalName = Buffer.from(
      file.originalname,
      'latin1'
    ).toString('utf8');

    const now = new Date().toISOString();

    const ext = path
      .extname(originalName)
      .replace('.', '')
      .toLowerCase();

    const fileId =
      'fil_' + crypto.randomBytes(6).toString('hex');

    const storagePath = getSafeStoragePath(
      ownerUserId,
      fileId,
      originalName
    );

    const { client, bucket } = requireStorage();

    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(storagePath, file.buffer, {
        contentType:
          file.mimetype || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error(
        'Supabase Storage upload failed:',
        uploadError
      );

      res.status(500).json({
        error: 'Failed to upload file to storage',
      });

      return;
    }

    const newFile: FileItem = {
      id: fileId,
      name: originalName,
      originalName,
      mimeType:
        file.mimetype || 'application/octet-stream',
      size: file.size,
      storagePath,
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

    try {
      await db.createFile(newFile);
    } catch (dbError) {
      // Database creation failed after successful storage upload.
      // Remove the orphaned storage object so the system stays consistent.
      try {
        await deleteStorageObject(storagePath);
      } catch (cleanupError) {
        console.error(
          'Failed to clean up orphaned storage object:',
          cleanupError
        );
      }

      throw dbError;
    }

    await db.logActivity(
      userId,
      'upload',
      'file',
      newFile.id,
      newFile.name
    );

    res.status(201).json({ file: newFile });
  } catch (error) {
    console.error('Upload file error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to upload file',
      });
    }
  }
}

export async function getFiles(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    const folderId =
      req.query.folderId === 'root' || !req.query.folderId
        ? null
        : (req.query.folderId as string);

    let targetUserId = userId;

    if (folderId) {
      const parentFolder = await db.getFolderById(folderId);

      if (!parentFolder || parentFolder.isDeleted) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }

      const hasAccess = await canAccessFolder(
        userId,
        folderId
      );

      if (!hasAccess) {
        res.status(403).json({
          error: 'Permission denied',
        });
        return;
      }

      targetUserId = parentFolder.userId;
    }

    const files = await db.getFilesByUser(
      targetUserId,
      folderId,
      false
    );

    res.json({ files });
  } catch (error) {
    console.error('Get files error:', error);

    res.status(500).json({
      error: 'Failed to retrieve files',
    });
  }
}

export async function getFileById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await db.getFileById(id);

    if (!file) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    const hasAccess = await canAccessFile(
      userId,
      file.id
    );

    if (!hasAccess) {
      res.status(403).json({
        error: 'Permission denied',
      });
      return;
    }

    const owner = await db.getUserById(file.userId);

    const shares = await db.getSharesByResource(
      'file',
      file.id
    );

    const linkShare = await db.getLinkShareByResource(
      'file',
      file.id
    );

    res.json({
      file,
      owner: owner
        ? {
            id: owner.id,
            name: owner.name,
            email: owner.email,
          }
        : null,
      shares,
      linkShare,
    });
  } catch (error) {
    console.error('Get file by ID error:', error);

    res.status(500).json({
      error: 'Failed to retrieve file',
    });
  }
}

export async function downloadFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const file = await db.getFileById(id);

    if (!file) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    if (userId) {
      const hasAccess = await canAccessFile(
        userId,
        file.id
      );

      if (!hasAccess) {
        res.status(403).json({
          error: 'Permission denied',
        });
        return;
      }
    }

    const fileBuffer = await downloadStorageObject(
      file.storagePath
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeDownloadFilename(file.name)}"`
    );

    res.setHeader(
      'Content-Type',
      file.mimeType || 'application/octet-stream'
    );

    res.setHeader(
      'Content-Length',
      fileBuffer.length
    );

    res.send(fileBuffer);
  } catch (error) {
    console.error('Download file error:', error);

    if (!res.headersSent) {
      res.status(404).json({
        error: 'File data missing from storage',
      });
    }
  }
}

export async function streamFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const file = await db.getFileById(id);

    if (!file) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    if (userId) {
      const hasAccess = await canAccessFile(
        userId,
        file.id
      );

      if (!hasAccess) {
        res.status(403).json({
          error: 'Permission denied',
        });
        return;
      }
    }

    const fileBuffer = await downloadStorageObject(
      file.storagePath
    );

    const fileSize = fileBuffer.length;
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type':
          file.mimeType || 'application/octet-stream',
        'Content-Disposition':
          `inline; filename="${encodeDownloadFilename(file.name)}"`,
        'Accept-Ranges': 'bytes',
      });

      res.end(fileBuffer);
      return;
    }

    const match = range.match(/bytes=(\d*)-(\d*)/);

    if (!match) {
      res.status(416).setHeader(
        'Content-Range',
        `bytes */${fileSize}`
      );

      res.end();
      return;
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2]
      ? parseInt(match[2], 10)
      : fileSize - 1;

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end < start ||
      start >= fileSize
    ) {
      res.status(416).setHeader(
        'Content-Range',
        `bytes */${fileSize}`
      );

      res.end();
      return;
    }

    end = Math.min(end, fileSize - 1);

    const chunk = fileBuffer.subarray(
      start,
      end + 1
    );

    res.writeHead(206, {
      'Content-Range':
        `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunk.length,
      'Content-Type':
        file.mimeType || 'application/octet-stream',
      'Content-Disposition':
        `inline; filename="${encodeDownloadFilename(file.name)}"`,
    });

    res.end(chunk);
  } catch (error) {
    console.error('Stream file error:', error);

    if (!res.headersSent) {
      res.status(404).json({
        error: 'File content not found',
      });
    }
  }
}

export async function getFileTextContent(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await db.getFileById(id);

    if (!file) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    const hasAccess = await canAccessFile(
      userId,
      file.id
    );

    if (!hasAccess) {
      res.status(403).json({
        error: 'Permission denied',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      res.status(400).json({
        error:
          'File is too large for inline text viewing (limit 2MB)',
      });
      return;
    }

    const fileBuffer = await downloadStorageObject(
      file.storagePath
    );

    const content = fileBuffer.toString('utf8');

    res.json({
      content,
      mimeType: file.mimeType,
      name: file.name,
    });
  } catch (error) {
    console.error(
      'Get file text content error:',
      error
    );

    res.status(500).json({
      error: 'Could not read text file',
    });
  }
}

export async function renameFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({
        error: 'File name is required',
      });
      return;
    }

    const file = await db.getFileById(id);

    if (!file || file.isDeleted) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    const hasAccess = await canAccessFile(
      userId,
      file.id,
      'editor'
    );

    if (!hasAccess) {
      res.status(403).json({
        error: 'Permission denied to rename this file',
      });
      return;
    }

    const oldName = file.name;
    const newName = name.trim();

    const ext = path
      .extname(newName)
      .replace('.', '')
      .toLowerCase();

    const updated = await db.updateFile(file.id, {
      name: newName,
      metadata: {
        ...(file.metadata || {}),
        extension: ext,
      },
    });

    await db.logActivity(
      userId,
      'rename',
      'file',
      file.id,
      newName,
      `Renamed from "${oldName}"`
    );

    res.json({
      file: updated || file,
    });
  } catch (error) {
    console.error('Rename file error:', error);

    res.status(500).json({
      error: 'Failed to rename file',
    });
  }
}

export async function moveFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { targetFolderId } = req.body;

    const file = await db.getFileById(id);

    if (!file || file.isDeleted) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    const hasAccess = await canAccessFile(
      userId,
      file.id,
      'editor'
    );

    if (!hasAccess) {
      res.status(403).json({
        error: 'Permission denied to move this file',
      });
      return;
    }

    const cleanTargetId =
      targetFolderId === 'root' || !targetFolderId
        ? null
        : targetFolderId;

    if (cleanTargetId) {
      const parentAllowed = await canAccessFolder(
        userId,
        cleanTargetId,
        'editor'
      );

      if (!parentAllowed) {
        res.status(403).json({
          error:
            'Permission denied to target destination folder',
        });
        return;
      }
    }

    const updated = await db.updateFile(file.id, {
      folderId: cleanTargetId,
    });

    await db.logActivity(
      userId,
      'move',
      'file',
      file.id,
      file.name
    );

    res.json({
      file: updated || file,
    });
  } catch (error) {
    console.error('Move file error:', error);

    res.status(500).json({
      error: 'Failed to move file',
    });
  }
}

export async function toggleStarFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await db.getFileById(id);

    if (!file || file.isDeleted) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    const updated = await db.updateFile(file.id, {
      isStarred: !file.isStarred,
    });

    const isStarredNow = !file.isStarred;

    await db.logActivity(
      userId,
      'star',
      'file',
      file.id,
      file.name,
      isStarredNow ? 'Starred' : 'Unstarred'
    );

    res.json({
      file: updated || file,
    });
  } catch (error) {
    console.error('Toggle star file error:', error);

    res.status(500).json({
      error: 'Failed to update star status',
    });
  }
}

export async function deleteFile(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const file = await db.getFileById(id);

    if (!file || file.isDeleted) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    const hasAccess = await canAccessFile(
      userId,
      file.id,
      'editor'
    );

    if (!hasAccess) {
      res.status(403).json({
        error: 'Permission denied to delete this file',
      });
      return;
    }

    /*
     * This endpoint moves the file to Trash.
     *
     * We intentionally DO NOT delete the Supabase Storage
     * object here because the trash system needs the file
     * to remain restorable.
     */
    const updated = await db.updateFile(file.id, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    });

    await db.logActivity(
      userId,
      'delete',
      'file',
      file.id,
      file.name,
      'Moved to Trash'
    );

    res.json({
      message: 'File moved to trash',
      file: updated || file,
    });
  } catch (error) {
    console.error('Delete file error:', error);

    res.status(500).json({
      error: 'Failed to move file to trash',
    });
  }
}