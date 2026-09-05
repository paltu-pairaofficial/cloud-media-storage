import { User, Folder, FileItem, Share, LinkShare, Activity, StorageStats } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'Request failed';
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // ==================== AUTH ====================
  async register(data: { name: string; email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async login(data: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async demoLogin(email?: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateProfile(data: { name?: string; avatarColor?: string }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // ==================== FOLDERS ====================
  async getFolders(parentId?: string | null): Promise<{ folders: Folder[] }> {
    const query = parentId ? `?parentId=${parentId}` : '';
    const res = await fetch(`${API_BASE}/folders${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getFolderTree(): Promise<{ folders: Folder[] }> {
    const res = await fetch(`${API_BASE}/folders/tree`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getFolderDetails(folderId: string): Promise<{ folder: Folder; breadcrumbs: { id: string; name: string }[] }> {
    const res = await fetch(`${API_BASE}/folders/${folderId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createFolder(name: string, parentId?: string | null, color?: string): Promise<{ folder: Folder }> {
    const res = await fetch(`${API_BASE}/folders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, parentId, color }),
    });
    return handleResponse(res);
  },

  async renameFolder(id: string, name: string): Promise<{ folder: Folder }> {
    const res = await fetch(`${API_BASE}/folders/${id}/rename`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse(res);
  },

  async moveFolder(id: string, targetParentId: string | null): Promise<{ folder: Folder }> {
    const res = await fetch(`${API_BASE}/folders/${id}/move`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetParentId }),
    });
    return handleResponse(res);
  },

  async toggleStarFolder(id: string): Promise<{ folder: Folder }> {
    const res = await fetch(`${API_BASE}/folders/${id}/star`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteFolder(id: string): Promise<{ message: string; folder: Folder }> {
    const res = await fetch(`${API_BASE}/folders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ==================== FILES ====================
  async getFiles(folderId?: string | null): Promise<{ files: FileItem[] }> {
    const query = folderId ? `?folderId=${folderId}` : '';
    const res = await fetch(`${API_BASE}/files${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getFileById(id: string): Promise<{
    file: FileItem;
    owner: { id: string; name: string; email: string } | null;
    shares: Share[];
    linkShare?: LinkShare;
  }> {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getFileTextContent(id: string): Promise<{ content: string; mimeType: string; name: string }> {
    const res = await fetch(`${API_BASE}/files/${id}/content`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async uploadFile(
    file: File,
    folderId?: string | null,
    onProgress?: (progress: number) => void
  ): Promise<{ file: FileItem }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      if (folderId && folderId !== 'root') {
        formData.append('folderId', folderId);
      }

      xhr.open('POST', `${API_BASE}/files/upload`);
      const token = localStorage.getItem('auth_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (err) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed with status ' + xhr.status));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload'));
      };

      xhr.send(formData);
    });
  },

  async renameFile(id: string, name: string): Promise<{ file: FileItem }> {
    const res = await fetch(`${API_BASE}/files/${id}/rename`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse(res);
  },

  async moveFile(id: string, targetFolderId: string | null): Promise<{ file: FileItem }> {
    const res = await fetch(`${API_BASE}/files/${id}/move`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetFolderId }),
    });
    return handleResponse(res);
  },

  async toggleStarFile(id: string): Promise<{ file: FileItem }> {
    const res = await fetch(`${API_BASE}/files/${id}/star`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteFile(id: string): Promise<{ message: string; file: FileItem }> {
    const res = await fetch(`${API_BASE}/files/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getDownloadUrl(fileId: string): string {
    const token = localStorage.getItem('auth_token');
    return token
      ? `${API_BASE}/files/${fileId}/download?token=${encodeURIComponent(token)}`
      : `${API_BASE}/files/${fileId}/download`;
  },

  getStreamUrl(fileId: string): string {
    const token = localStorage.getItem('auth_token');
    return token
      ? `${API_BASE}/files/${fileId}/stream?token=${encodeURIComponent(token)}`
      : `${API_BASE}/files/${fileId}/stream`;
  },

  // ==================== TRASH ====================
  async getTrash(): Promise<{ folders: Folder[]; files: FileItem[] }> {
    const res = await fetch(`${API_BASE}/trash`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async restoreItem(type: 'file' | 'folder', id: string): Promise<{ message: string; item: any }> {
    const res = await fetch(`${API_BASE}/trash/restore/${type}/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deletePermanently(type: 'file' | 'folder', id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/trash/permanent/${type}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async emptyTrash(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/trash/empty`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ==================== SHARING ====================
  async shareResource(data: {
    resourceType: 'file' | 'folder';
    resourceId: string;
    email: string;
    role: 'viewer' | 'editor';
  }): Promise<{ message: string; share: Share }> {
    const res = await fetch(`${API_BASE}/shares`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getResourceShares(
    resourceType: 'file' | 'folder',
    resourceId: string
  ): Promise<{
    owner: { id: string; name: string; email: string; avatarColor: string } | null;
    shares: Share[];
    isOwner: boolean;
  }> {
    const res = await fetch(`${API_BASE}/shares/${resourceType}/${resourceId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateShareRole(shareId: string, role: 'viewer' | 'editor'): Promise<{ share: Share }> {
    const res = await fetch(`${API_BASE}/shares/${shareId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    return handleResponse(res);
  },

  async removeShare(shareId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/shares/${shareId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getSharedWithMe(): Promise<{ files: FileItem[]; folders: Folder[] }> {
    const res = await fetch(`${API_BASE}/shares/shared-with-me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // ==================== PUBLIC LINKS ====================
  async createOrUpdateLinkShare(data: {
    resourceType: 'file' | 'folder';
    resourceId: string;
    role: 'viewer' | 'editor';
    allowDownload?: boolean;
  }): Promise<{ linkShare: LinkShare }> {
    const res = await fetch(`${API_BASE}/link-shares`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getLinkShare(resourceType: 'file' | 'folder', resourceId: string): Promise<{ linkShare: LinkShare | null }> {
    const res = await fetch(`${API_BASE}/link-shares/${resourceType}/${resourceId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async removeLinkShare(resourceType: 'file' | 'folder', resourceId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/link-shares/${resourceType}/${resourceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getPublicResource(token: string): Promise<{
    linkShare: { role: string; allowDownload: boolean; createdAt: string };
    resourceType: 'file' | 'folder';
    file?: FileItem;
    folder?: Folder;
    files?: FileItem[];
    folders?: Folder[];
    owner?: { name: string; avatarColor: string } | null;
  }> {
    const res = await fetch(`${API_BASE}/public/resource/${token}`);
    return handleResponse(res);
  },

  getPublicDownloadUrl(token: string): string {
    return `${API_BASE}/public/download/${token}`;
  },

  // ==================== SEARCH, RECENT, STARRED & STATS ====================
  async search(params: {
    q?: string;
    type?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ files: FileItem[]; folders: Folder[]; totalCount: number }> {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const res = await fetch(`${API_BASE}/search?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getRecentFiles(): Promise<{ files: FileItem[] }> {
    const res = await fetch(`${API_BASE}/recent`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getStarredItems(): Promise<{ folders: Folder[]; files: FileItem[] }> {
    const res = await fetch(`${API_BASE}/starred`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getActivities(): Promise<{ activities: Activity[] }> {
    const res = await fetch(`${API_BASE}/activities`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getStorageStats(): Promise<StorageStats> {
    const res = await fetch(`${API_BASE}/stats/storage`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
