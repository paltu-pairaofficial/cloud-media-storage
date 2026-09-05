import React, { useState, useRef, useEffect } from 'react';
import {
  Folder as FolderIcon,
  MoreVertical,
  Star,
  Share2,
  Edit2,
  FolderInput,
  Trash2,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Folder } from '../../types';
import { useDrive } from '../../context/DriveContext';

interface FolderCardProps {
  folder: Folder;
  isTrash?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, isTrash = false }) => {
  const {
    navigateToFolder,
    toggleStarFolder,
    selectedFolderIds,
    toggleSelectFolder,
    setShareModalTarget,
    setRenameModalTarget,
    setMoveModalTarget,
    setDeleteModalTarget,
    restoreItem,
    moveFile,
    moveFolder,
  } = useDrive();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedFolderIds.includes(folder.id);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Drag and Drop for moving items into this folder
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/folder-id', folder.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const fileId = e.dataTransfer.getData('application/file-id');
    const sourceFolderId = e.dataTransfer.getData('application/folder-id');

    if (fileId) {
      moveFile(fileId, folder.id);
    } else if (sourceFolderId && sourceFolderId !== folder.id) {
      moveFolder(sourceFolderId, folder.id);
    }
  };

  return (
    <div
      draggable={!isTrash}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        toggleSelectFolder(folder.id, e.ctrlKey || e.metaKey || e.shiftKey);
      }}
      onDoubleClick={() => {
        if (!isTrash) navigateToFolder(folder.id);
      }}
      className={`group relative flex items-center justify-between p-3.5 rounded-[24px] border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-[#5A5A40]/10 border-[#5A5A40] ring-2 ring-[#5A5A40]/20 shadow-xs'
          : isDragOver
          ? 'bg-[#5A5A40]/15 border-[#5A5A40] scale-[1.02] shadow-md ring-2 ring-[#5A5A40]/30'
          : 'bg-white hover:bg-[#F9F9F7] border-[#E5E5DF] hover:border-[#5A5A40]/50 shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Folder Icon and Name */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className="w-11 h-11 rounded-[16px] bg-[#F5F5F0] flex items-center justify-center shrink-0 border border-[#E5E5DF]/70"
          style={{
            color: folder.color && folder.color !== '#3b82f6' ? folder.color : '#5A5A40',
          }}
        >
          <FolderIcon className="w-5 h-5 fill-current" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#2D2D2A] truncate group-hover:text-[#5A5A40] transition-colors">
            {folder.name}
          </p>
          <p className="text-[11px] text-[#8E8E8A] font-medium">
            {folder.itemCount !== undefined
              ? `${folder.itemCount} item${folder.itemCount === 1 ? '' : 's'}`
              : 'Folder'}
            {folder.sharedRole && (
              <span className="ml-1 text-[#5A5A40] font-semibold">• {folder.sharedRole}</span>
            )}
          </p>
        </div>
      </div>

      {/* Action Buttons: Star + 3-dots Menu */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {!isTrash && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStarFolder(folder.id);
            }}
            className={`p-1.5 rounded-full transition-all ${
              folder.isStarred
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-[#D1D1CB] hover:text-[#8E8E8A] opacity-0 group-hover:opacity-100'
            }`}
            title={folder.isStarred ? 'Unstar folder' : 'Star folder'}
          >
            <Star
              className={`w-4 h-4 ${folder.isStarred ? 'fill-amber-400' : ''}`}
            />
          </button>
        )}

        {/* 3-dots menu button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-[#E5E5DF] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              {!isTrash ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToFolder(folder.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <FolderIcon className="w-4 h-4 text-[#5A5A40]" />
                    <span>Open folder</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Share2 className="w-4 h-4 text-[#5A5A40]" />
                    <span>Share folder</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStarFolder(folder.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        folder.isStarred ? 'text-amber-500 fill-amber-400' : 'text-[#8E8E8A]'
                      }`}
                    />
                    <span>{folder.isStarred ? 'Unstar' : 'Add to Starred'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Edit2 className="w-4 h-4 text-[#71716A]" />
                    <span>Rename</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <FolderInput className="w-4 h-4 text-[#71716A]" />
                    <span>Move</span>
                  </button>

                  <div className="h-px bg-[#E5E5DF] my-1" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium text-left"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Move to Trash</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreItem('folder', folder.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 font-medium text-left"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalTarget({ type: 'folder', id: folder.id, name: folder.name, isPermanent: true });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 font-medium text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Forever</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
