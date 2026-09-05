import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { UPLOADS_DIR } from './db.js';
import { authenticate } from './middleware/auth.js';
import * as authController from './controllers/authController.js';
import * as folderController from './controllers/folderController.js';
import * as fileController from './controllers/fileController.js';
import * as trashController from './controllers/trashController.js';
import * as shareController from './controllers/shareController.js';
import * as linkShareController from './controllers/linkShareController.js';
import * as searchController from './controllers/searchController.js';
import * as recentController from './controllers/recentController.js';
import * as statsController from './controllers/statsController.js';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max per file in demo
  },
});

export const apiRouter = Router();

// ==================== AUTH ROUTES ====================
apiRouter.post('/auth/register', authController.register);
apiRouter.post('/auth/login', authController.login);
apiRouter.post('/auth/demo-login', authController.demoLogin);
apiRouter.get('/auth/me', authenticate, authController.me);
apiRouter.put('/auth/profile', authenticate, authController.updateProfile);

// ==================== FOLDER ROUTES ====================
apiRouter.get('/folders', authenticate, folderController.getFolders);
apiRouter.get('/folders/tree', authenticate, folderController.getFolderTree);
apiRouter.get('/folders/:id', authenticate, folderController.getFolderDetails);
apiRouter.post('/folders', authenticate, folderController.createFolder);
apiRouter.put('/folders/:id/rename', authenticate, folderController.renameFolder);
apiRouter.put('/folders/:id/move', authenticate, folderController.moveFolder);
apiRouter.put('/folders/:id/star', authenticate, folderController.toggleStarFolder);
apiRouter.delete('/folders/:id', authenticate, folderController.deleteFolder);

// ==================== FILE ROUTES ====================
apiRouter.post('/files/upload', authenticate, upload.single('file'), fileController.uploadFile);
apiRouter.get('/files', authenticate, fileController.getFiles);
apiRouter.get('/files/:id', authenticate, fileController.getFileById);
apiRouter.get('/files/:id/download', authenticate, fileController.downloadFile);
apiRouter.get('/files/:id/stream', authenticate, fileController.streamFile);
apiRouter.get('/files/:id/content', authenticate, fileController.getFileTextContent);
apiRouter.put('/files/:id/rename', authenticate, fileController.renameFile);
apiRouter.put('/files/:id/move', authenticate, fileController.moveFile);
apiRouter.put('/files/:id/star', authenticate, fileController.toggleStarFile);
apiRouter.delete('/files/:id', authenticate, fileController.deleteFile);

// ==================== TRASH ROUTES ====================
apiRouter.get('/trash', authenticate, trashController.getTrash);
apiRouter.post('/trash/restore/:type/:id', authenticate, trashController.restoreItem);
apiRouter.delete('/trash/permanent/:type/:id', authenticate, trashController.deletePermanently);
apiRouter.delete('/trash/empty', authenticate, trashController.emptyTrash);

// ==================== SHARING ROUTES ====================
apiRouter.post('/shares', authenticate, shareController.shareResource);
apiRouter.get('/shares/shared-with-me', authenticate, shareController.getSharedWithMe);
apiRouter.get('/shares/:resourceType/:resourceId', authenticate, shareController.getResourceShares);
apiRouter.put('/shares/:shareId', authenticate, shareController.updateShareRole);
apiRouter.delete('/shares/:shareId', authenticate, shareController.removeShare);

// ==================== LINK SHARES (PUBLIC & PRIVATE) ====================
apiRouter.post('/link-shares', authenticate, linkShareController.createOrUpdateLinkShare);
apiRouter.get('/link-shares/:resourceType/:resourceId', authenticate, linkShareController.getLinkShare);
apiRouter.delete('/link-shares/:resourceType/:resourceId', authenticate, linkShareController.removeLinkShare);

// Publicly accessible endpoints without auth header
apiRouter.get('/public/resource/:token', linkShareController.getPublicResource);
apiRouter.get('/public/download/:token', linkShareController.downloadPublicFile);

// ==================== SEARCH, RECENT, STARRED & STATS ====================
apiRouter.get('/search', authenticate, searchController.search);
apiRouter.get('/recent', authenticate, recentController.getRecentFiles);
apiRouter.get('/starred', authenticate, recentController.getStarredItems);
apiRouter.get('/activities', authenticate, recentController.getActivities);
apiRouter.get('/stats/storage', authenticate, statsController.getStorageStats);
