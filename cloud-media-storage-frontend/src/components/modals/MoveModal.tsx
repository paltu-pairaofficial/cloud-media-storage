import React, { useState, useEffect } from 'react';
import { X, FolderInput, HardDrive, Folder as FolderIcon, ChevronRight } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { Folder } from '../../types';
import { api } from '../../services/api';

export const MoveModal: React.FC = () => {
  const { moveModalTarget, setMoveModalTarget, moveFile, moveFolder } = useDrive();

  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null is My Drive root
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (moveModalTarget) {
      setError('');
      api.getFolderTree().then((res) => {
        // Filter out target folder itself and its descendants if target is a folder
        if (moveModalTarget.type === 'folder') {
          const invalidIds = new Set<string>([moveModalTarget.id]);
          const findChildren = (pId: string) => {
            res.folders.filter((f) => f.parentId === pId).forEach((c) => {
              invalidIds.add(c.id);
              findChildren(c.id);
            });
          };
          findChildren(moveModalTarget.id);
          setAllFolders(res.folders.filter((f) => !invalidIds.has(f.id)));
        } else {
          setAllFolders(res.folders);
        }
      });
    }
  }, [moveModalTarget]);

  if (!moveModalTarget) return null;

  const handleMove = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      if (moveModalTarget.type === 'file') {
        await moveFile(moveModalTarget.id, selectedFolderId);
      } else {
        await moveFolder(moveModalTarget.id, selectedFolderId);
      }
      setMoveModalTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to move item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2A]/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-[#E5E5DF] animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-[#F5F5F0] text-[#5A5A40] border border-[#E5E5DF] flex items-center justify-center">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif]">Move "{moveModalTarget.name}"</h3>
              <p className="text-xs text-[#8E8E8A]">Select a destination folder</p>
            </div>
          </div>

          <button
            onClick={() => setMoveModalTarget(null)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Folder Picker Tree List */}
        <div className="flex-1 overflow-y-auto border border-[#E5E5DF] rounded-[18px] p-2 my-3 space-y-1 bg-[#F5F5F0]/60 min-h-[220px]">
          {/* Root Option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-xs font-semibold transition-all ${
              selectedFolderId === null
                ? 'bg-[#5A5A40] text-white shadow-xs'
                : 'text-[#2D2D2A] hover:bg-white'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>My Drive (Root Directory)</span>
          </button>

          {/* Subfolders List */}
          {allFolders.map((f) => {
            const isSelected = selectedFolderId === f.id;
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => setSelectedFolderId(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-[#2D2D2A] hover:bg-white'
                }`}
                style={{ paddingLeft: f.parentId ? '2rem' : '0.75rem' }}
              >
                {f.parentId && <ChevronRight className="w-3.5 h-3.5 text-[#8E8E8A]" />}
                <FolderIcon
                  className="w-4 h-4"
                  style={{ color: isSelected ? '#ffffff' : f.color || '#5A5A40' }}
                />
                <span className="truncate flex-1 text-left">{f.name}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-xs font-semibold text-rose-600 mb-2 shrink-0">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setMoveModalTarget(null)}
            className="px-4 py-2 text-xs font-semibold text-[#71716A] hover:bg-[#F5F5F0] rounded-[14px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm transition-all"
          >
            {isSubmitting ? 'Moving...' : 'Move Here'}
          </button>
        </div>
      </div>
    </div>
  );
};
