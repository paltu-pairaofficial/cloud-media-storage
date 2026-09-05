import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  ArrowUpDown,
  Share2,
  Download,
  FolderInput,
  Edit2,
  Trash2,
  Star,
  Info,
  X,
  RotateCcw,
  CheckSquare,
  Square,
  Trash,
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { Breadcrumbs } from './Breadcrumbs';
import { SortField } from '../../types';

export const Toolbar: React.FC = () => {
  const {
    currentTab,
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    selectedFileIds,
    selectedFolderIds,
    clearSelection,
    selectAll,
    files,
    folders,
    trashFiles,
    trashFolders,
    setShareModalTarget,
    setRenameModalTarget,
    setMoveModalTarget,
    setDeleteModalTarget,
    setDetailsModalTarget,
    toggleStarFile,
    toggleStarFolder,
    downloadFile,
    restoreItem,
    emptyTrash,
  } = useDrive();

  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const selectedCount = selectedFileIds.length + selectedFolderIds.length;
  const isTrashTab = currentTab === 'trash';

  const totalItemsCount = isTrashTab
    ? trashFiles.length + trashFolders.length
    : files.length + folders.length;

  const isAllSelected = selectedCount > 0 && selectedCount === totalItemsCount;

  // Close sort menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setIsSortOpen(false);
  };

  // Find single selected item if exactly 1 item selected
  const singleFile = selectedFileIds.length === 1 && selectedFolderIds.length === 0
    ? (isTrashTab ? trashFiles : files).find((f) => f.id === selectedFileIds[0])
    : null;

  const singleFolder = selectedFolderIds.length === 1 && selectedFileIds.length === 0
    ? (isTrashTab ? trashFolders : folders).find((f) => f.id === selectedFolderIds[0])
    : null;

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-[#E5E5DF] px-6 sm:px-8 py-3 flex items-center justify-between gap-4 sticky top-16 z-20 select-none">
      {/* Left Side: Breadcrumbs or Active Selection Banner */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2 bg-[#5A5A40]/10 text-[#5A5A40] px-3.5 py-1.5 rounded-full border border-[#5A5A40]/25 text-xs font-semibold animate-in fade-in duration-100">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 hover:text-[#4A4A34] transition-colors cursor-pointer"
              title={isAllSelected ? 'All items selected' : 'Select all'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#5A5A40]" />
              ) : (
                <Square className="w-4 h-4 text-[#5A5A40]" />
              )}
              <span>{selectedCount} selected</span>
            </button>

            <button
              onClick={clearSelection}
              className="p-1 hover:bg-[#5A5A40]/20 rounded-full transition-colors ml-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Breadcrumbs />
        )}
      </div>

      {/* Right Side: Selection Action Buttons + Sort/View controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Contextual Actions when Items Selected */}
        {selectedCount > 0 && !isTrashTab && (
          <div className="flex items-center gap-1 border-r border-[#E5E5DF] pr-2 mr-1 animate-in fade-in duration-100">
            {/* Share action (only if 1 item selected) */}
            {(singleFile || singleFolder) && (
              <button
                onClick={() => {
                  if (singleFile) setShareModalTarget({ type: 'file', id: singleFile.id, name: singleFile.name });
                  if (singleFolder) setShareModalTarget({ type: 'folder', id: singleFolder.id, name: singleFolder.name });
                }}
                className="p-2 text-[#71716A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {/* Download file (if 1 file selected) */}
            {singleFile && (
              <button
                onClick={() => downloadFile(singleFile)}
                className="p-2 text-[#71716A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Star / Unstar */}
            {(singleFile || singleFolder) && (
              <button
                onClick={() => {
                  if (singleFile) toggleStarFile(singleFile.id);
                  if (singleFolder) toggleStarFolder(singleFolder.id);
                }}
                className="p-2 text-[#71716A] hover:text-amber-600 hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="Star / Unstar"
              >
                <Star
                  className={`w-4 h-4 ${
                    (singleFile?.isStarred || singleFolder?.isStarred)
                      ? 'fill-amber-500 text-amber-600'
                      : ''
                  }`}
                />
              </button>
            )}

            {/* Rename */}
            {(singleFile || singleFolder) && (
              <button
                onClick={() => {
                  if (singleFile) setRenameModalTarget({ type: 'file', id: singleFile.id, name: singleFile.name });
                  if (singleFolder) setRenameModalTarget({ type: 'folder', id: singleFolder.id, name: singleFolder.name });
                }}
                className="p-2 text-[#71716A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="Rename"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Move */}
            {(singleFile || singleFolder) && (
              <button
                onClick={() => {
                  if (singleFile) setMoveModalTarget({ type: 'file', id: singleFile.id, name: singleFile.name });
                  if (singleFolder) setMoveModalTarget({ type: 'folder', id: singleFolder.id, name: singleFolder.name });
                }}
                className="p-2 text-[#71716A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="Move"
              >
                <FolderInput className="w-4 h-4" />
              </button>
            )}

            {/* Details inspector */}
            {singleFile && (
              <button
                onClick={() => setDetailsModalTarget(singleFile)}
                className="p-2 text-[#71716A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                title="File details"
              >
                <Info className="w-4 h-4" />
              </button>
            )}

            {/* Delete / Move to trash */}
            <button
              onClick={() => {
                if (singleFile) setDeleteModalTarget({ type: 'file', id: singleFile.id, name: singleFile.name });
                else if (singleFolder) setDeleteModalTarget({ type: 'folder', id: singleFolder.id, name: singleFolder.name });
              }}
              className="p-2 text-[#71716A] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
              title="Move to Trash"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Contextual Actions when inside Trash */}
        {isTrashTab && selectedCount > 0 && (
          <div className="flex items-center gap-1 border-r border-[#E5E5DF] pr-2 mr-1">
            <button
              onClick={() => {
                if (singleFile) restoreItem('file', singleFile.id);
                if (singleFolder) restoreItem('folder', singleFolder.id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5A5A40]/10 text-[#5A5A40] hover:bg-[#5A5A40]/20 rounded-full text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>

            <button
              onClick={() => {
                if (singleFile) setDeleteModalTarget({ type: 'file', id: singleFile.id, name: singleFile.name, isPermanent: true });
                if (singleFolder) setDeleteModalTarget({ type: 'folder', id: singleFolder.id, name: singleFolder.name, isPermanent: true });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-full text-xs font-semibold transition-colors"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Delete Forever</span>
            </button>
          </div>
        )}

        {/* Empty Trash Button */}
        {isTrashTab && totalItemsCount > 0 && (
          <button
            onClick={() => emptyTrash()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-100/70 hover:bg-rose-100 text-rose-800 rounded-full text-xs font-bold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Trash</span>
          </button>
        )}

        {/* Sort Menu Dropdown */}
        <div className="relative" ref={sortMenuRef}>
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D2D2A] bg-white hover:bg-[#F5F5F0] rounded-full transition-colors border border-[#E5E5DF]"
            title="Sort options"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#8E8E8A]" />
            <span className="capitalize">{sortField}</span>
            <span className="text-[10px] text-[#8E8E8A] font-normal">
              ({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})
            </span>
          </button>

          {isSortOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-[#E5E5DF] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              <div className="text-[10px] font-bold text-[#8E8E8A] uppercase tracking-wider px-3 py-1">
                Sort by
              </div>

              {(['name', 'date', 'size'] as SortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSortChange(field)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                    sortField === field
                      ? 'bg-[#5A5A40]/10 text-[#5A5A40] font-semibold'
                      : 'text-[#71716A] hover:bg-[#F5F5F0]'
                  }`}
                >
                  <span className="capitalize">
                    {field === 'date' ? 'Last modified' : field}
                  </span>
                  {sortField === field && (
                    <span className="text-[10px] uppercase font-bold text-[#5A5A40]">
                      {sortOrder}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid vs List View Toggle */}
        <div className="flex items-center bg-[#EFEFEA] p-0.5 rounded-full border border-[#E5E5DF]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-full transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-[#2D2D2A] shadow-2xs font-semibold'
                : 'text-[#8E8E8A] hover:text-[#2D2D2A]'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-full transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-[#2D2D2A] shadow-2xs font-semibold'
                : 'text-[#8E8E8A] hover:text-[#2D2D2A]'
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
