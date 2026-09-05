import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getRecentFiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const allFiles = await db.getAllUserFiles(userId, false);
  const recentFiles = allFiles
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30);

  res.json({ files: recentFiles });
}

export async function getStarredItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const allFolders = await db.getAllUserFolders(userId, false);
  const allFiles = await db.getAllUserFiles(userId, false);

  const starredFolders = allFolders.filter((f) => f.isStarred);
  const starredFiles = allFiles.filter((f) => f.isStarred);

  res.json({
    folders: starredFolders,
    files: starredFiles,
  });
}

export async function getActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const userActivities = await db.getUserActivities(userId, 50);

  res.json({ activities: userActivities });
}
