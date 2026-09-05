import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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
  metadata?: Record<string, any>;
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

export interface DatabaseSchema {
  users: User[];
  folders: Folder[];
  files: FileItem[];
  shares: Share[];
  linkShares: LinkShare[];
  activities: Activity[];
}

export const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Supabase client instance (initialized if credentials provided)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const isSupabaseConfigured = (): boolean => !!supabase;

// Fallback seed hash for demo password "password123"
const DEFAULT_PASSWORD_HASH = '$2b$10$6qE/zS7hoX74lu/bWgBSj.5oKyh5kTaa6Ns.dK4n0RRbP7E88QJX6';

function getInitialLocalData(): DatabaseSchema {
  const aliceId = 'usr_alice_01';
  const bobId = 'usr_bob_02';
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: aliceId,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        passwordHash: DEFAULT_PASSWORD_HASH,
        avatarColor: '#3b82f6',
        createdAt: now,
      },
      {
        id: bobId,
        name: 'Bob Smith',
        email: 'bob@example.com',
        passwordHash: DEFAULT_PASSWORD_HASH,
        avatarColor: '#10b981',
        createdAt: now,
      },
    ],
    folders: [
      {
        id: 'fld_docs_01',
        name: 'Documents',
        parentId: null,
        userId: aliceId,
        isStarred: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        color: '#3b82f6',
      },
      {
        id: 'fld_photos_02',
        name: 'Photos & Media',
        parentId: null,
        userId: aliceId,
        isStarred: false,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        color: '#ec4899',
      },
      {
        id: 'fld_proj_03',
        name: 'Projects & Work',
        parentId: null,
        userId: aliceId,
        isStarred: true,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        color: '#8b5cf6',
      },
      {
        id: 'fld_sub_archive_04',
        name: 'Archive 2025',
        parentId: 'fld_docs_01',
        userId: aliceId,
        isStarred: false,
        isDeleted: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        color: '#64748b',
      },
    ],
    files: [],
    shares: [
      {
        id: 'shr_01',
        resourceType: 'folder',
        resourceId: 'fld_proj_03',
        ownerId: aliceId,
        sharedWithUserId: bobId,
        sharedWithEmail: 'bob@example.com',
        role: 'editor',
        createdAt: now,
      },
    ],
    linkShares: [],
    activities: [
      {
        id: 'act_01',
        userId: aliceId,
        action: 'create_folder',
        resourceType: 'folder',
        resourceId: 'fld_proj_03',
        resourceName: 'Projects & Work',
        createdAt: now,
      },
    ],
  };
}

// Helpers to map PostgreSQL snake_case <-> Application camelCase
export function userFromRow(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarColor: row.avatar_color || '#3b82f6',
    createdAt: row.created_at,
  };
}

export function userToRow(u: User): any {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password_hash: u.passwordHash,
    avatar_color: u.avatarColor,
    created_at: u.createdAt,
    updated_at: new Date().toISOString(),
  };
}

export function folderFromRow(row: any): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || null,
    userId: row.user_id,
    color: row.color || '#3b82f6',
    isStarred: Boolean(row.is_starred),
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function folderToRow(f: Folder): any {
  return {
    id: f.id,
    name: f.name,
    parent_id: f.parentId || null,
    user_id: f.userId,
    color: f.color || '#3b82f6',
    is_starred: f.isStarred,
    is_deleted: f.isDeleted,
    deleted_at: f.deletedAt || null,
    created_at: f.createdAt,
    updated_at: f.updatedAt || new Date().toISOString(),
  };
}

export function fileFromRow(row: any): FileItem {
  return {
    id: row.id,
    name: row.name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: Number(row.size || 0),
    storagePath: row.storage_path,
    folderId: row.folder_id || null,
    userId: row.user_id,
    metadata: row.metadata || {},
    isStarred: Boolean(row.is_starred),
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function fileToRow(f: FileItem): any {
  return {
    id: f.id,
    name: f.name,
    original_name: f.originalName,
    mime_type: f.mimeType,
    size: f.size,
    storage_path: f.storagePath,
    folder_id: f.folderId || null,
    user_id: f.userId,
    metadata: f.metadata || {},
    is_starred: f.isStarred,
    is_deleted: f.isDeleted,
    deleted_at: f.deletedAt || null,
    created_at: f.createdAt,
    updated_at: f.updatedAt || new Date().toISOString(),
  };
}

export function shareFromRow(row: any): Share {
  return {
    id: row.id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ownerId: row.owner_id,
    sharedWithUserId: row.shared_with_user_id || '',
    sharedWithEmail: row.shared_with_email,
    role: row.role || 'viewer',
    createdAt: row.created_at,
  };
}

export function shareToRow(s: Share): any {
  return {
    id: s.id,
    resource_type: s.resourceType,
    resource_id: s.resourceId,
    owner_id: s.ownerId,
    shared_with_user_id: s.sharedWithUserId || null,
    shared_with_email: s.sharedWithEmail,
    role: s.role,
    created_at: s.createdAt,
  };
}

export function linkShareFromRow(row: any): LinkShare {
  return {
    id: row.id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    ownerId: row.owner_id,
    token: row.token,
    role: row.role || 'viewer',
    allowDownload: row.allow_download !== false,
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
  };
}

export function linkShareToRow(l: LinkShare): any {
  return {
    id: l.id,
    resource_type: l.resourceType,
    resource_id: l.resourceId,
    owner_id: l.ownerId,
    token: l.token,
    role: l.role,
    allow_download: l.allowDownload,
    expires_at: l.expiresAt || null,
    created_at: l.createdAt,
  };
}

export function activityFromRow(row: any): Activity {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    details: row.details || undefined,
    createdAt: row.created_at,
  };
}

export function activityToRow(a: Activity): any {
  return {
    id: a.id,
    user_id: a.userId,
    action: a.action,
    resource_type: a.resourceType,
    resource_id: a.resourceId,
    resource_name: a.resourceName,
    details: a.details || null,
    created_at: a.createdAt,
  };
}

const DB_FILE = path.join(process.cwd(), 'data', 'storage_db.json');

/**
 * Unified Database Layer:
 * Seamlessly interfaces with Supabase PostgreSQL if SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY
 * are present, or falls back to local storage_db.json persistence.
 */
class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadLocal();
  }

  // Synchronous getters for in-memory sync compatibility
  get users() { return this.data.users; }
  get folders() { return this.data.folders; }
  get files() { return this.data.files; }
  get shares() { return this.data.shares; }
  get linkShares() { return this.data.linkShares; }
  get activities() { return this.data.activities; }

  private loadLocal(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        let updated = false;
        if (parsed.users && Array.isArray(parsed.users)) {
          for (const u of parsed.users) {
            if (u.passwordHash === '$2a$10$wKqKskqGj1yZ1H.8eB2Nq.QZ6F2J.lW0WqUq8b4k9O4QeY5Y8x3x2') {
              u.passwordHash = DEFAULT_PASSWORD_HASH;
              updated = true;
            }
          }
        }
        if (updated) {
          this.saveLocal(parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load database JSON, reinitializing:', e);
    }
    const initial = getInitialLocalData();
    this.saveLocal(initial);
    return initial;
  }

  public save(updatedData?: DatabaseSchema): void {
    if (updatedData) {
      this.data = updatedData;
    }
    this.saveLocal(this.data);
  }

  private saveLocal(dataToSave: DatabaseSchema): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write storage_db.json:', e);
    }
  }

  // ==========================================
  // ASYNC POSTGRES / SUPABASE METHODS
  // ==========================================

  // --- USERS ---
  async getUserById(id: string): Promise<User | null> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (!error && data) return userFromRow(data);
    }
    return this.data.users.find((u) => u.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').ilike('email', normalized).single();
      if (!error && data) return userFromRow(data);
    }
    return this.data.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  async getFirstUser(): Promise<User | null> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true }).limit(1);
      if (!error && data && data.length > 0) return userFromRow(data[0]);
    }
    return this.data.users[0] || null;
  }

  async createUser(user: User): Promise<User> {
    if (supabase) {
      const { error } = await supabase.from('users').insert(userToRow(user));
      if (error) console.error('Supabase createUser error:', error);
    }
    const idx = this.data.users.findIndex((u) => u.id === user.id);
    if (idx === -1) {
      this.data.users.push(user);
    } else {
      this.data.users[idx] = user;
    }
    this.save();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.avatarColor !== undefined) payload.avatar_color = updates.avatarColor;
      if (updates.passwordHash !== undefined) payload.password_hash = updates.passwordHash;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('users').update(payload).eq('id', id);
      if (error) console.error('Supabase updateUser error:', error);
    }

    const localUser = this.data.users.find((u) => u.id === id);
    if (localUser) {
      if (updates.name !== undefined) localUser.name = updates.name;
      if (updates.avatarColor !== undefined) localUser.avatarColor = updates.avatarColor;
      if (updates.passwordHash !== undefined) localUser.passwordHash = updates.passwordHash;
      this.save();
      return localUser;
    }
    return null;
  }

  // --- FOLDERS ---
  async getFolderById(id: string): Promise<Folder | null> {
    if (supabase) {
      const { data, error } = await supabase.from('folders').select('*').eq('id', id).single();
      if (!error && data) return folderFromRow(data);
    }
    return this.data.folders.find((f) => f.id === id) || null;
  }

  async getFoldersByUser(userId: string, parentId: string | null = null, includeDeleted = false): Promise<Folder[]> {
    if (supabase) {
      let query = supabase.from('folders').select('*').eq('user_id', userId).eq('is_deleted', includeDeleted);
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
      const { data, error } = await query;
      if (!error && data) return data.map(folderFromRow);
    }

    return this.data.folders.filter(
      (f) => f.userId === userId && f.isDeleted === includeDeleted && f.parentId === parentId
    );
  }

  async getAllUserFolders(userId: string, includeDeleted = false): Promise<Folder[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', includeDeleted);
      if (!error && data) return data.map(folderFromRow);
    }
    return this.data.folders.filter((f) => f.userId === userId && f.isDeleted === includeDeleted);
  }

  async createFolder(folder: Folder): Promise<Folder> {
    if (supabase) {
      const { error } = await supabase.from('folders').insert(folderToRow(folder));
      if (error) console.error('Supabase createFolder error:', error);
    }
    this.data.folders.push(folder);
    this.save();
    return folder;
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder | null> {
    if (supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.parentId !== undefined) payload.parent_id = updates.parentId;
      if (updates.color !== undefined) payload.color = updates.color;
      if (updates.isStarred !== undefined) payload.is_starred = updates.isStarred;
      if (updates.isDeleted !== undefined) payload.is_deleted = updates.isDeleted;
      if (updates.deletedAt !== undefined) payload.deleted_at = updates.deletedAt;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('folders').update(payload).eq('id', id);
      if (error) console.error('Supabase updateFolder error:', error);
    }

    const folder = this.data.folders.find((f) => f.id === id);
    if (folder) {
      Object.assign(folder, updates);
      folder.updatedAt = new Date().toISOString();
      this.save();
      return folder;
    }
    return null;
  }

  async deleteFolderPermanently(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) console.error('Supabase deleteFolder error:', error);
    }
    this.data.folders = this.data.folders.filter((f) => f.id !== id);
    this.save();
  }

  // --- FILES ---
  async getFileById(id: string): Promise<FileItem | null> {
    if (supabase) {
      const { data, error } = await supabase.from('files').select('*').eq('id', id).single();
      if (!error && data) return fileFromRow(data);
    }
    return this.data.files.find((f) => f.id === id) || null;
  }

  async getFilesByUser(userId: string, folderId: string | null = null, includeDeleted = false): Promise<FileItem[]> {
    if (supabase) {
      let query = supabase.from('files').select('*').eq('user_id', userId).eq('is_deleted', includeDeleted);
      if (folderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', folderId);
      }
      const { data, error } = await query;
      if (!error && data) return data.map(fileFromRow);
    }
    return this.data.files.filter(
      (f) => f.userId === userId && f.isDeleted === includeDeleted && f.folderId === folderId
    );
  }

  async getAllUserFiles(userId: string, includeDeleted = false): Promise<FileItem[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .eq('is_deleted', includeDeleted);
      if (!error && data) return data.map(fileFromRow);
    }
    return this.data.files.filter((f) => f.userId === userId && f.isDeleted === includeDeleted);
  }

  async createFile(file: FileItem): Promise<FileItem> {
    if (supabase) {
      const { error } = await supabase.from('files').insert(fileToRow(file));
      if (error) console.error('Supabase createFile error:', error);
    }
    this.data.files.push(file);
    this.save();
    return file;
  }

  async updateFile(id: string, updates: Partial<FileItem>): Promise<FileItem | null> {
    if (supabase) {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.originalName !== undefined) payload.original_name = updates.originalName;
      if (updates.folderId !== undefined) payload.folder_id = updates.folderId;
      if (updates.isStarred !== undefined) payload.is_starred = updates.isStarred;
      if (updates.isDeleted !== undefined) payload.is_deleted = updates.isDeleted;
      if (updates.deletedAt !== undefined) payload.deleted_at = updates.deletedAt;
      if (updates.metadata !== undefined) payload.metadata = updates.metadata;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from('files').update(payload).eq('id', id);
      if (error) console.error('Supabase updateFile error:', error);
    }

    const file = this.data.files.find((f) => f.id === id);
    if (file) {
      Object.assign(file, updates);
      file.updatedAt = new Date().toISOString();
      this.save();
      return file;
    }
    return null;
  }

  async deleteFilePermanently(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) console.error('Supabase deleteFile error:', error);
    }
    this.data.files = this.data.files.filter((f) => f.id !== id);
    this.save();
  }

  // --- SHARES ---
  async getSharesByResource(resourceType: 'file' | 'folder', resourceId: string): Promise<Share[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('shares')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);
      if (!error && data) return data.map(shareFromRow);
    }
    return this.data.shares.filter((s) => s.resourceType === resourceType && s.resourceId === resourceId);
  }

  async getSharesForUser(userId: string): Promise<Share[]> {
    if (supabase) {
      const { data, error } = await supabase.from('shares').select('*').eq('shared_with_user_id', userId);
      if (!error && data) return data.map(shareFromRow);
    }
    return this.data.shares.filter((s) => s.sharedWithUserId === userId);
  }

  async getShareById(id: string): Promise<Share | null> {
    if (supabase) {
      const { data, error } = await supabase.from('shares').select('*').eq('id', id).single();
      if (!error && data) return shareFromRow(data);
    }
    return this.data.shares.find((s) => s.id === id) || null;
  }

  async createOrUpdateShare(share: Share): Promise<Share> {
    if (supabase) {
      const { error } = await supabase.from('shares').upsert(shareToRow(share), { onConflict: 'id' });
      if (error) console.error('Supabase upsert share error:', error);
    }
    const idx = this.data.shares.findIndex((s) => s.id === share.id);
    if (idx >= 0) {
      this.data.shares[idx] = share;
    } else {
      this.data.shares.push(share);
    }
    this.save();
    return share;
  }

  async removeShare(id: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('shares').delete().eq('id', id);
      if (error) console.error('Supabase removeShare error:', error);
    }
    this.data.shares = this.data.shares.filter((s) => s.id !== id);
    this.save();
  }

  // --- PUBLIC LINKS ---
  async getLinkShareByToken(token: string): Promise<LinkShare | null> {
    if (supabase) {
      const { data, error } = await supabase.from('public_links').select('*').eq('token', token).single();
      if (!error && data) return linkShareFromRow(data);
    }
    return this.data.linkShares.find((l) => l.token === token) || null;
  }

  async getLinkShareByResource(resourceType: 'file' | 'folder', resourceId: string): Promise<LinkShare | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('public_links')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .single();
      if (!error && data) return linkShareFromRow(data);
    }
    return this.data.linkShares.find((l) => l.resourceType === resourceType && l.resourceId === resourceId) || null;
  }

  async createOrUpdateLinkShare(link: LinkShare): Promise<LinkShare> {
    if (supabase) {
      const { error } = await supabase.from('public_links').upsert(linkShareToRow(link), { onConflict: 'id' });
      if (error) console.error('Supabase upsert public_link error:', error);
    }
    const idx = this.data.linkShares.findIndex((l) => l.id === link.id);
    if (idx >= 0) {
      this.data.linkShares[idx] = link;
    } else {
      this.data.linkShares.push(link);
    }
    this.save();
    return link;
  }

  async removeLinkShare(resourceType: 'file' | 'folder', resourceId: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('public_links')
        .delete()
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);
      if (error) console.error('Supabase remove public_link error:', error);
    }
    this.data.linkShares = this.data.linkShares.filter(
      (l) => !(l.resourceType === resourceType && l.resourceId === resourceId)
    );
    this.save();
  }

  // --- ACTIVITIES ---
  async logActivity(
    userId: string,
    action: Activity['action'],
    resourceType: 'file' | 'folder',
    resourceId: string,
    resourceName: string,
    details?: string
  ): Promise<Activity> {
    const act: Activity = {
      id: 'act_' + Math.random().toString(36).substring(2, 10),
      userId,
      action,
      resourceType,
      resourceId,
      resourceName,
      details,
      createdAt: new Date().toISOString(),
    };

    if (supabase) {
      const { error } = await supabase.from('activities').insert(activityToRow(act));
      if (error) console.error('Supabase logActivity error:', error);
    }

    this.data.activities.unshift(act);
    if (this.data.activities.length > 200) {
      this.data.activities = this.data.activities.slice(0, 200);
    }
    this.save();
    return act;
  }

  async getUserActivities(userId: string, limit = 50): Promise<Activity[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && data) return data.map(activityFromRow);
    }
    return this.data.activities.filter((a) => a.userId === userId).slice(0, limit);
  }
}

export const db = new DatabaseManager();
