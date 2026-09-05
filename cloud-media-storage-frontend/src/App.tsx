import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DriveProvider, useDrive } from './context/DriveContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Toolbar } from './components/common/Toolbar';
import { FolderCard } from './components/folders/FolderCard';
import { FileCard } from './components/files/FileCard';
import { FileList } from './components/files/FileList';
import { UploadZone } from './components/files/UploadZone';
import { FilePreviewModal } from './components/preview/FilePreviewModal';
import { CreateFolderModal } from './components/modals/CreateFolderModal';
import { RenameModal } from './components/modals/RenameModal';
import { MoveModal } from './components/modals/MoveModal';
import { DeleteModal } from './components/modals/DeleteModal';
import { ShareModal } from './components/modals/ShareModal';
import { FileDetailsModal } from './components/modals/FileDetailsModal';
import { StorageBreakdownModal } from './components/modals/StorageBreakdownModal';
import { AuthView } from './components/auth/AuthView';
import {
  HardDrive,
  FolderPlus,
  Upload,
  Loader2,
  FolderOpen,
  Trash2,
  Star,
  Users,
  Clock,
} from 'lucide-react';

const DriveDashboard: React.FC = () => {
  const { user, isAuthenticated, isAuthLoading } = useAuth();
  const {
    currentTab,
    viewMode,
    folders,
    files,
    trashFolders,
    trashFiles,
    isLoading,
    setIsCreateFolderOpen,
    searchQuery,
  } = useDrive();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center text-[#2D2D2A] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
        <p className="text-xs font-semibold text-[#71716A]">Connecting to Cloud Drive...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <AuthView />;
  }

  const isTrashTab = currentTab === 'trash';
  const displayFolders = isTrashTab ? trashFolders : folders;
  const displayFiles = isTrashTab ? trashFiles : files;
  const hasItems = displayFolders.length > 0 || displayFiles.length > 0;

  const getTabTitle = () => {
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    switch (currentTab) {
      case 'my-drive':
        return 'My Drive';
      case 'shared-with-me':
        return 'Shared with me';
      case 'starred':
        return 'Starred';
      case 'recent':
        return 'Recent';
      case 'trash':
        return 'Trash';
      default:
        return 'My Drive';
    }
  };

  const getEmptyStateContent = () => {
    switch (currentTab) {
      case 'shared-with-me':
        return {
          icon: Users,
          title: 'No shared files or folders',
          desc: 'Items that other users share with you will appear here.',
        };
      case 'starred':
        return {
          icon: Star,
          title: 'No starred items',
          desc: 'Add stars to files and folders that you want to easily find later.',
        };
      case 'recent':
        return {
          icon: Clock,
          title: 'No recent activity',
          desc: 'Files you upload, preview, or edit will show up here.',
        };
      case 'trash':
        return {
          icon: Trash2,
          title: 'Trash is empty',
          desc: 'Items moved to trash will stay here until you empty trash or permanently delete them.',
        };
      default:
        return {
          icon: FolderOpen,
          title: 'This folder is empty',
          desc: 'Drop files here or use the "+ New" button to create folders or upload files.',
        };
    }
  };

  const emptyState = getEmptyStateContent();
  const EmptyIcon = emptyState.icon;

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col text-[#2D2D2A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 flex max-w-full">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Drive Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Toolbar */}
          <Toolbar />

          {/* Content Pane */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#8E8E8A]">
                <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
                <p className="text-xs font-semibold">Loading items...</p>
              </div>
            ) : !hasItems ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-[24px] bg-white border border-[#E5E5DF] flex items-center justify-center text-[#5A5A40] mb-4 shadow-sm">
                  <EmptyIcon className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-[#1A1A17] font-serif mb-1">{emptyState.title}</h3>
                <p className="text-xs text-[#71716A] leading-relaxed mb-6">{emptyState.desc}</p>

                {currentTab === 'my-drive' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCreateFolderOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E5E5DF] hover:border-[#5A5A40] text-[#2D2D2A] text-xs font-semibold rounded-full shadow-2xs hover:shadow-xs transition-all"
                    >
                      <FolderPlus className="w-4 h-4 text-[#5A5A40]" />
                      <span>New Folder</span>
                    </button>
                  </div>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="space-y-8">
                {/* Folders Grid Section */}
                {displayFolders.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8E8A] mb-3.5 px-1">
                      Folders ({displayFolders.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {displayFolders.map((folder) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          isTrash={isTrashTab}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Files Grid Section */}
                {displayFiles.length > 0 && (
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8E8A] mb-3.5 px-1">
                      Files ({displayFiles.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {displayFiles.map((file) => (
                        <FileCard
                          key={file.id}
                          file={file}
                          isTrash={isTrashTab}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              /* List View Mode */
              <FileList
                folders={displayFolders}
                files={displayFiles}
                isTrash={isTrashTab}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals & Utilities */}
      <UploadZone />
      <FilePreviewModal />
      <CreateFolderModal />
      <RenameModal />
      <MoveModal />
      <DeleteModal />
      <ShareModal />
      <FileDetailsModal />
      <StorageBreakdownModal />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <DriveProvider>
        <DriveDashboard />
      </DriveProvider>
    </AuthProvider>
  );
}

export default App;
