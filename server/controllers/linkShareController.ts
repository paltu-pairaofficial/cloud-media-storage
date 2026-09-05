import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, LinkShare, supabase } from '../db.js';
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

async function downloadStorageObject(
  storagePath: string
): Promise<Buffer> {
  const { client, bucket } = requireStorage();

  const { data, error } = await client.storage
    .from(bucket)
    .download(storagePath);

  if (error) {
    throw new Error(
      `Supabase Storage download failed: ${error.message}`
    );
  }

  if (!data) {
    throw new Error('Supabase Storage returned no file data');
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function createOrUpdateLinkShare(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;
    const {
      resourceType,
      resourceId,
      role,
      allowDownload,
    } = req.body;

    if (!resourceType || !resourceId) {
      res.status(400).json({
        error: 'resourceType and resourceId are required',
      });
      return;
    }

    // Check ownership
    if (resourceType === 'file') {
      const file = await db.getFileById(resourceId);

      if (
        !file ||
        file.isDeleted ||
        file.userId !== userId
      ) {
        res.status(403).json({
          error:
            'Only the resource owner can generate public links',
        });
        return;
      }
    } else {
      const folder = await db.getFolderById(resourceId);

      if (
        !folder ||
        folder.isDeleted ||
        folder.userId !== userId
      ) {
        res.status(403).json({
          error:
            'Only the resource owner can generate public links',
        });
        return;
      }
    }

    let linkShare = await db.getLinkShareByResource(
      resourceType,
      resourceId
    );

    if (linkShare) {
      linkShare.role =
        role === 'editor' ? 'editor' : 'viewer';

      linkShare.allowDownload =
        allowDownload !== false;

      linkShare =
        await db.createOrUpdateLinkShare(linkShare);
    } else {
      const newLink: LinkShare = {
        id:
          'lnk_' +
          crypto.randomBytes(6).toString('hex'),
        resourceType,
        resourceId,
        ownerId: userId,
        token: crypto.randomBytes(16).toString('hex'),
        role:
          role === 'editor' ? 'editor' : 'viewer',
        allowDownload:
          allowDownload !== false,
        expiresAt: null,
        createdAt: new Date().toISOString(),
      };

      linkShare =
        await db.createOrUpdateLinkShare(newLink);
    }

    res.json({ linkShare });
  } catch (error) {
    console.error(
      'Create/update link share error:',
      error
    );

    res.status(500).json({
      error: 'Failed to create or update link share',
    });
  }
}

export async function getLinkShare(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const {
      resourceType,
      resourceId,
    } = req.params;

    const linkShare =
      await db.getLinkShareByResource(
        resourceType as 'file' | 'folder',
        resourceId
      );

    res.json({
      linkShare: linkShare || null,
    });
  } catch (error) {
    console.error('Get link share error:', error);

    res.status(500).json({
      error: 'Failed to retrieve link share',
    });
  }
}

export async function removeLinkShare(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.id;

    const {
      resourceType,
      resourceId,
    } = req.params;

    const linkShare =
      await db.getLinkShareByResource(
        resourceType as 'file' | 'folder',
        resourceId
      );

    if (
      !linkShare ||
      linkShare.ownerId !== userId
    ) {
      res.status(404).json({
        error:
          'Link share not found or permission denied',
      });
      return;
    }

    await db.removeLinkShare(
      resourceType as 'file' | 'folder',
      resourceId
    );

    res.json({
      message: 'Public link removed',
    });
  } catch (error) {
    console.error(
      'Remove link share error:',
      error
    );

    res.status(500).json({
      error: 'Failed to remove public link',
    });
  }
}

// ============================================================
// PUBLIC RESOURCE
// ============================================================
// Unauthenticated endpoint.
// Returns metadata about a shared file/folder.
// ============================================================

export async function getPublicResource(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { token } = req.params;

    const link =
      await db.getLinkShareByToken(token);

    if (!link) {
      res.status(404).json({
        error: 'Invalid or expired share link',
      });
      return;
    }

    const owner =
      await db.getUserById(link.ownerId);

    if (link.resourceType === 'file') {
      const file =
        await db.getFileById(link.resourceId);

      if (!file || file.isDeleted) {
        res.status(404).json({
          error:
            'The shared file was deleted or is no longer available',
        });
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
        owner: owner
          ? {
              name: owner.name,
              avatarColor: owner.avatarColor,
            }
          : null,
      });

      return;
    }

    const folder =
      await db.getFolderById(link.resourceId);

    if (!folder || folder.isDeleted) {
      res.status(404).json({
        error:
          'The shared folder was deleted or is no longer available',
      });
      return;
    }

    // Children of shared folder
    const allUserFolders =
      await db.getAllUserFolders(
        folder.userId,
        false
      );

    const allUserFiles =
      await db.getAllUserFiles(
        folder.userId,
        false
      );

    const childFolders =
      allUserFolders.filter(
        (f) => f.parentId === folder.id
      );

    const childFiles =
      allUserFiles.filter(
        (f) => f.folderId === folder.id
      );

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
      owner: owner
        ? {
            name: owner.name,
            avatarColor: owner.avatarColor,
          }
        : null,
    });
  } catch (error) {
    console.error(
      'Get public resource error:',
      error
    );

    res.status(500).json({
      error: 'Failed to retrieve public resource',
    });
  }
}

// ============================================================
// PUBLIC FILE DOWNLOAD
// ============================================================
// Downloads the actual file from Supabase Storage.
// No local filesystem is used.
// ============================================================

export async function downloadPublicFile(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { token } = req.params;

    const link =
      await db.getLinkShareByToken(token);

    if (!link) {
      res.status(404).json({
        error: 'Invalid link',
      });
      return;
    }

    if (!link.allowDownload) {
      res.status(403).json({
        error:
          'Downloads are disabled by the owner for this shared link',
      });
      return;
    }

    if (link.resourceType !== 'file') {
      res.status(400).json({
        error:
          'This public link does not point to a file',
      });
      return;
    }

    const file =
      await db.getFileById(link.resourceId);

    if (!file || file.isDeleted) {
      res.status(404).json({
        error: 'File not found',
      });
      return;
    }

    // Download the actual file from Supabase Storage.
    const fileBuffer =
      await downloadStorageObject(
        file.storagePath
      );

    const safeFilename = encodeURIComponent(
      file.name
    ).replace(/%20/g, ' ');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"`
    );

    res.setHeader(
      'Content-Type',
      file.mimeType ||
        'application/octet-stream'
    );

    res.setHeader(
      'Content-Length',
      fileBuffer.length
    );

    res.send(fileBuffer);
  } catch (error) {
    console.error(
      'Public file download error:',
      error
    );

    if (!res.headersSent) {
      res.status(404).json({
        error:
          'File data missing from Supabase Storage',
      });
    }
  }
}