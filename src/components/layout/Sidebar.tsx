import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  FolderPlus,
  Upload,
  HardDrive,
  Users,
  Star,
  Clock,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  Cloud,
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { TabType, Folder } from '../../types';
import { formatBytes } from '../../utils/formatters';
import { api } from '../../services/api';

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    currentFolderId,
    navigateToFolder,
    setIsCreateFolderOpen,
    uploadFiles,
    stats,
    setIsStorageModalOpen,
  } = useDrive();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load folder tree
  useEffect(() => {
    async function loadTree() {
      try {
        const res = await api.getFolderTree();
        setAllFolders(res.folders);
      } catch (e) {
        // ignore
      }
    }
    loadTree();
  }, [currentFolderId, currentTab]);

  // Click outside to close + New menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setIsNewMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems: { tab: TabType; label: string; icon: any }[] = [
    { tab: 'my-drive', label: 'My Drive', icon: HardDrive },
    { tab: 'shared-with-me', label: 'Shared with me', icon: Users },
    { tab: 'starred', label: 'Starred', icon: Star },
    { tab: 'recent', label: 'Recent', icon: Clock },
    { tab: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const rootFolders = allFolders.filter((f) => !f.parentId);

  return (
    <aside className="w-64 bg-transparent border-r border-[#E5E5DF] p-4 flex flex-col justify-between select-none h-[calc(100vh-4rem)] sticky top-16 shrink-0">
      {/* Top Section: + New button and Navigation Links */}
      <div className="space-y-5">
        {/* + New Button Dropdown */}
        <div className="relative" ref={newMenuRef}>
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="w-full bg-[#5A5A40] hover:bg-[#4A4A34] text-white rounded-full py-3 px-5 flex items-center justify-between font-semibold text-sm shadow-md shadow-[#5A5A40]/20 hover:shadow-lg transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Asset</span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-75" />
          </button>

          {/* New Menu Dropdown */}
          {isNewMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E5E5DF] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setIsCreateFolderOpen(true);
                  setIsNewMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#2D2D2A] hover:bg-[#F5F5F0] transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-[#5A5A40]" />
                <span>New folder</span>
              </button>

              <div className="h-px bg-[#E5E5DF] my-1" />

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setIsNewMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#2D2D2A] hover:bg-[#F5F5F0] transition-colors"
              >
                <Upload className="w-4 h-4 text-[#5A5A40]" />
                <span>File upload</span>
              </button>

              <button
                onClick={() => {
                  folderInputRef.current?.click();
                  setIsNewMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#2D2D2A] hover:bg-[#F5F5F0] transition-colors"
              >
                <FolderIcon className="w-4 h-4 text-[#71716A]" />
                <span>Folder upload</span>
              </button>
            </div>
          )}

          {/* Hidden File inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFileUpload}
            multiple
            // @ts-ignore
            webkitdirectory="true"
            className="hidden"
          />
        </div>

        {/* Primary Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentTab === item.tab && (item.tab !== 'my-drive' || currentFolderId === null);
            return (
              <button
                key={item.tab}
                onClick={() => {
                  if (item.tab === 'my-drive') {
                    navigateToFolder(null);
                  } else {
                    setCurrentTab(item.tab);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#5A5A40]/10 text-[#5A5A40] font-semibold'
                    : 'text-[#71716A] hover:bg-white hover:text-[#2D2D2A]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#5A5A40]' : 'text-[#8E8E8A]'}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Folder Hierarchy quick tree */}
        {rootFolders.length > 0 && (
          <div className="pt-2 border-t border-[#E5E5DF]">
            <button
              onClick={() => setIsTreeExpanded(!isTreeExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-[#8E8E8A] uppercase tracking-[0.2em] px-3 py-1.5 hover:text-[#2D2D2A] transition-colors"
            >
              <span>Folders</span>
              {isTreeExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isTreeExpanded && (
              <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {rootFolders.map((f) => {
                  const isCurrent = currentFolderId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => navigateToFolder(f.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isCurrent
                          ? 'bg-[#5A5A40]/10 text-[#5A5A40] font-semibold'
                          : 'text-[#71716A] hover:bg-white hover:text-[#2D2D2A]'
                      }`}
                    >
                      <FolderIcon
                        className="w-3.5 h-3.5"
                        style={{ color: isCurrent ? '#5A5A40' : f.color || '#8E8E8A' }}
                      />
                      <span className="truncate text-left flex-1">{f.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Storage Card */}
      {stats && (
        <div className="pt-3 border-t border-[#E5E5DF]">
          <div className="bg-white p-4 rounded-[24px] border border-[#E5E5DF] shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D2D2A]">
                <Cloud className="w-4 h-4 text-[#5A5A40]" />
                <span>Storage</span>
              </div>
              <span className="text-xs font-bold text-[#5A5A40]">
                {stats.percentage}%
              </span>
            </div>

            {/* Storage Progress bar */}
            <div className="w-full h-2 bg-[#E5E5DF] rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full bg-[#5A5A40] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(2, Math.min(100, stats.percentage))}%` }}
              />
            </div>

            <p className="text-[11px] text-[#8E8E8A] mb-3">
              <span className="font-semibold text-[#2D2D2A]">{formatBytes(stats.totalBytes)}</span> of 1 GB used
            </p>

            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="w-full py-2 text-center text-xs font-semibold text-[#2D2D2A] bg-[#F5F5F0] hover:bg-[#EFEFEA] border border-[#E5E5DF] hover:border-[#5A5A40]/40 rounded-full transition-all"
            >
              Storage Breakdown
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
