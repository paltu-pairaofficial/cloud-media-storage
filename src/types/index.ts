export interface User {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  isStarred: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  color?: string;
  itemCount?: number;
  subFolderCount?: number;
  fileCount?: number;
  sharedRole?: 'viewer' | 'editor';
  sharedAt?: string;
  ownerName?: string;
  ownerEmail?: string;
}

export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  folderId: string | null;
  userId: string;
  isStarred: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    extension?: string;
  };
  sharedRole?: 'viewer' | 'editor';
  sharedAt?: string;
  ownerName?: string;
  ownerEmail?: string;
}

export interface Share {
  id: string;
  resourceType: 'file' | 'folder';
  resourceId: string;
  ownerId: string;
  sharedWithUserId: string;
  sharedWithEmail: string;
  role: 'viewer' | 'editor';
  createdAt: string;
  userName?: string;
  userAvatarColor?: string;
}

export interface LinkShare {
  id: string;
  resourceType: 'file' | 'folder';
  resourceId: string;
  ownerId: string;
  token: string;
  role: 'viewer' | 'editor';
  allowDownload: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: 'upload' | 'create_folder' | 'rename' | 'move' | 'delete' | 'restore' | 'share' | 'star';
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  details?: string;
  createdAt: string;
}

export interface StorageStats {
  totalBytes: number;
  totalCount: number;
  folderCount: number;
  storageQuotaBytes: number;
  percentage: number;
  breakdown: {
    images: number;
    videos: number;
    audio: number;
    documents: number;
    others: number;
  };
}

export type TabType = 'my-drive' | 'shared-with-me' | 'starred' | 'recent' | 'trash';
export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'date' | 'size';
export type SortOrder = 'asc' | 'desc';
export type MediaTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'code' | 'archive';

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface UploadProgressItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface DeleteModalTarget {
  type: 'file' | 'folder' | 'multiple';
  id: string;
  name: string;
  isPermanent?: boolean;
  fileIds?: string[];
  folderIds?: string[];
}

export interface ShareModalTarget {
  type: 'file' | 'folder' | 'multiple';
  id: string;
  name: string;
  fileIds?: string[];
  folderIds?: string[];
}
