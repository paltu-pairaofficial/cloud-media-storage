import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FileItem,
  StorageStats,
  TabType,
  ViewMode,
  SortField,
  SortOrder,
  MediaTypeFilter,
  BreadcrumbItem,
  UploadProgressItem,
} from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DriveContextType {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  currentFolderId: string | null;
  currentFolder: Folder | null;
  breadcrumbs: BreadcrumbItem[];
  folders: Folder[];
  files: FileItem[];
  trashFolders: Folder[];
  trashFiles: FileItem[];
  stats: StorageStats | null;
  isLoading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  mediaTypeFilter: MediaTypeFilter;
  setMediaTypeFilter: (filter: MediaTypeFilter) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  selectedFileIds: string[];
  selectedFolderIds: string[];
  toggleSelectFile: (id: string, multi?: boolean) => void;
  toggleSelectFolder: (id: string, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  navigateToFolder: (folderId: string | null) => void;
  refresh: () => Promise<void>;
  // Active modals / preview states
  previewFile: FileItem | null;
  setPreviewFile: (file: FileItem | null) => void;
  shareModalTarget: { type: 'file' | 'folder'; id: string; name: string } | null;
  setShareModalTarget: (target: { type: 'file' | 'folder'; id: string; name: string } | null) => void;
  renameModalTarget: { type: 'file' | 'folder'; id: string; name: string } | null;
  setRenameModalTarget: (target: { type: 'file' | 'folder'; id: string; name: string } | null) => void;
  moveModalTarget: { type: 'file' | 'folder'; id: string; name: string } | null;
  setMoveModalTarget: (target: { type: 'file' | 'folder'; id: string; name: string } | null) => void;
  deleteModalTarget: { type: 'file' | 'folder'; id: string; name: string; isPermanent?: boolean } | null;
  setDeleteModalTarget: (target: { type: 'file' | 'folder'; id: string; name: string; isPermanent?: boolean } | null) => void;
  detailsModalTarget: FileItem | null;
  setDetailsModalTarget: (file: FileItem | null) => void;
  isCreateFolderOpen: boolean;
  setIsCreateFolderOpen: (open: boolean) => void;
  isStorageModalOpen: boolean;
  setIsStorageModalOpen: (open: boolean) => void;
  // Uploads
  uploadQueue: UploadProgressItem[];
  uploadFiles: (fileList: FileList | File[]) => Promise<void>;
  dismissUploadItem: (id: string) => void;
  clearCompletedUploads: () => void;
  // Item actions
  createFolder: (name: string, color?: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  moveFolder: (id: string, targetParentId: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleStarFolder: (id: string) => Promise<void>;
  renameFile: (id: string, name: string) => Promise<void>;
  moveFile: (id: string, targetFolderId: string | null) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  toggleStarFile: (id: string) => Promise<void>;
  downloadFile: (file: FileItem) => void;
  // Trash actions
  restoreItem: (type: 'file' | 'folder', id: string) => Promise<void>;
  permanentDeleteItem: (type: 'file' | 'folder', id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const DriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('my-drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'My Drive' }]);
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [trashFolders, setTrashFolders] = useState<Folder[]>([]);
  const [trashFiles, setTrashFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  // Modals state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [shareModalTarget, setShareModalTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [renameModalTarget, setRenameModalTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [moveModalTarget, setMoveModalTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [deleteModalTarget, setDeleteModalTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string; isPermanent?: boolean } | null>(null);
  const [detailsModalTarget, setDetailsModalTarget] = useState<FileItem | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState<UploadProgressItem[]>([]);

  // Load storage stats
  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const statsRes = await api.getStorageStats();
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [user]);

  // Load current view items
  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (searchQuery.trim() !== '' || mediaTypeFilter !== 'all') {
        const searchRes = await api.search({
          q: searchQuery.trim(),
          type: mediaTypeFilter,
          sortBy: sortField,
          sortOrder: sortOrder,
        });
        setFiles(searchRes.files);
        setFolders(searchRes.folders);
      } else if (currentTab === 'my-drive') {
        const [foldersRes, filesRes] = await Promise.all([
          api.getFolders(currentFolderId),
          api.getFiles(currentFolderId),
        ]);

        let loadedFolders = foldersRes.folders;
        let loadedFiles = filesRes.files;

        // Apply sorting
        loadedFolders.sort((a, b) => {
          let cmp = a.name.localeCompare(b.name);
          return sortOrder === 'desc' ? -cmp : cmp;
        });

        loadedFiles.sort((a, b) => {
          let cmp = 0;
          if (sortField === 'name') cmp = a.name.localeCompare(b.name);
          else if (sortField === 'date') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          else if (sortField === 'size') cmp = a.size - b.size;
          return sortOrder === 'desc' ? -cmp : cmp;
        });

        setFolders(loadedFolders);
        setFiles(loadedFiles);

        // Fetch folder details if inside subfolder
        if (currentFolderId && currentFolderId !== 'root') {
          const detailRes = await api.getFolderDetails(currentFolderId);
          setCurrentFolder(detailRes.folder);
          setBreadcrumbs(detailRes.breadcrumbs);
        } else {
          setCurrentFolder(null);
          setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
        }
      } else if (currentTab === 'shared-with-me') {
        const sharedRes = await api.getSharedWithMe();
        setFiles(sharedRes.files);
        setFolders(sharedRes.folders);
        setBreadcrumbs([{ id: 'shared', name: 'Shared with me' }]);
      } else if (currentTab === 'starred') {
        const starredRes = await api.getStarredItems();
        setFiles(starredRes.files);
        setFolders(starredRes.folders);
        setBreadcrumbs([{ id: 'starred', name: 'Starred' }]);
      } else if (currentTab === 'recent') {
        const recentRes = await api.getRecentFiles();
        setFiles(recentRes.files);
        setFolders([]);
        setBreadcrumbs([{ id: 'recent', name: 'Recent' }]);
      } else if (currentTab === 'trash') {
        const trashRes = await api.getTrash();
        setTrashFiles(trashRes.files);
        setTrashFolders(trashRes.folders);
        setBreadcrumbs([{ id: 'trash', name: 'Trash' }]);
      }

      loadStats();
    } catch (err) {
      console.error('Failed to load drive items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentTab, currentFolderId, searchQuery, mediaTypeFilter, sortField, sortOrder, loadStats]);

  useEffect(() => {
    refresh();
    clearSelection();
  }, [refresh]);

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setCurrentTab('my-drive');
    setSearchQuery('');
    setMediaTypeFilter('all');
    clearSelection();
  };

  const toggleSelectFile = (id: string, multi = false) => {
    if (multi) {
      setSelectedFileIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else {
      setSelectedFileIds((prev) => (prev.length === 1 && prev[0] === id ? [] : [id]));
      setSelectedFolderIds([]);
    }
  };

  const toggleSelectFolder = (id: string, multi = false) => {
    if (multi) {
      setSelectedFolderIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else {
      setSelectedFolderIds((prev) => (prev.length === 1 && prev[0] === id ? [] : [id]));
      setSelectedFileIds([]);
    }
  };

  const selectAll = () => {
    if (currentTab === 'trash') {
      setSelectedFileIds(trashFiles.map((f) => f.id));
      setSelectedFolderIds(trashFolders.map((f) => f.id));
    } else {
      setSelectedFileIds(files.map((f) => f.id));
      setSelectedFolderIds(folders.map((f) => f.id));
    }
  };

  const clearSelection = () => {
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  };

  // Upload handler
  const uploadFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    for (const file of filesArray) {
      const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);
      const newUploadItem: UploadProgressItem = {
        id: uploadId,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading',
      };

      setUploadQueue((prev) => [newUploadItem, ...prev]);

      try {
        await api.uploadFile(file, currentFolderId, (progress) => {
          setUploadQueue((prev) =>
            prev.map((item) => (item.id === uploadId ? { ...item, progress } : item))
          );
        });

        setUploadQueue((prev) =>
          prev.map((item) => (item.id === uploadId ? { ...item, progress: 100, status: 'completed' } : item))
        );
      } catch (err: any) {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, status: 'error', error: err.message || 'Upload failed' } : item
          )
        );
      }
    }

    refresh();
  };

  const dismissUploadItem = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompletedUploads = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status === 'uploading'));
  };

  // CRUD actions
  const createFolder = async (name: string, color?: string) => {
    await api.createFolder(name, currentFolderId, color);
    refresh();
  };

  const renameFolder = async (id: string, name: string) => {
    await api.renameFolder(id, name);
    refresh();
  };

  const moveFolder = async (id: string, targetParentId: string | null) => {
    await api.moveFolder(id, targetParentId);
    refresh();
  };

  const deleteFolder = async (id: string) => {
    await api.deleteFolder(id);
    clearSelection();
    refresh();
  };

  const toggleStarFolder = async (id: string) => {
    await api.toggleStarFolder(id);
    refresh();
  };

  const renameFile = async (id: string, name: string) => {
    await api.renameFile(id, name);
    refresh();
  };

  const moveFile = async (id: string, targetFolderId: string | null) => {
    await api.moveFile(id, targetFolderId);
    refresh();
  };

  const deleteFile = async (id: string) => {
    await api.deleteFile(id);
    clearSelection();
    refresh();
  };

  const toggleStarFile = async (id: string) => {
    await api.toggleStarFile(id);
    refresh();
  };

  const downloadFile = (file: FileItem) => {
    const url = api.getDownloadUrl(file.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const restoreItem = async (type: 'file' | 'folder', id: string) => {
    await api.restoreItem(type, id);
    refresh();
  };

  const permanentDeleteItem = async (type: 'file' | 'folder', id: string) => {
    await api.deletePermanently(type, id);
    refresh();
  };

  const emptyTrash = async () => {
    await api.emptyTrash();
    refresh();
  };

  return (
    <DriveContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        currentFolderId,
        currentFolder,
        breadcrumbs,
        folders,
        files,
        trashFolders,
        trashFiles,
        stats,
        isLoading,
        viewMode,
        setViewMode,
        searchQuery,
        setSearchQuery,
        mediaTypeFilter,
        setMediaTypeFilter,
        sortField,
        setSortField,
        sortOrder,
        setSortOrder,
        selectedFileIds,
        selectedFolderIds,
        toggleSelectFile,
        toggleSelectFolder,
        selectAll,
        clearSelection,
        navigateToFolder,
        refresh,
        previewFile,
        setPreviewFile,
        shareModalTarget,
        setShareModalTarget,
        renameModalTarget,
        setRenameModalTarget,
        moveModalTarget,
        setMoveModalTarget,
        deleteModalTarget,
        setDeleteModalTarget,
        detailsModalTarget,
        setDetailsModalTarget,
        isCreateFolderOpen,
        setIsCreateFolderOpen,
        isStorageModalOpen,
        setIsStorageModalOpen,
        uploadQueue,
        uploadFiles,
        dismissUploadItem,
        clearCompletedUploads,
        createFolder,
        renameFolder,
        moveFolder,
        deleteFolder,
        toggleStarFolder,
        renameFile,
        moveFile,
        deleteFile,
        toggleStarFile,
        downloadFile,
        restoreItem,
        permanentDeleteItem,
        emptyTrash,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};
