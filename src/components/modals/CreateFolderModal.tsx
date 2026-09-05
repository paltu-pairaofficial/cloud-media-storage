import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';

const FOLDER_COLORS = ['#5A5A40', '#736B5E', '#8C5E4E', '#4A5D4E', '#3D5A5B', '#7A6B40', '#635B6D'];

export const CreateFolderModal: React.FC = () => {
  const { isCreateFolderOpen, setIsCreateFolderOpen, createFolder } = useDrive();

  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#5A5A40');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isCreateFolderOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Please enter a folder name');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createFolder(folderName.trim(), selectedColor);
      setFolderName('');
      setIsCreateFolderOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2A]/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-[#E5E5DF] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-[#F5F5F0] text-[#5A5A40] border border-[#E5E5DF] flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif]">New Folder</h3>
          </div>

          <button
            onClick={() => setIsCreateFolderOpen(false)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#71716A] mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Untitled folder"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-sm font-medium text-[#2D2D2A] outline-none transition-all placeholder:text-[#8E8E8A]"
            />
          </div>

          {/* Folder Color Accent Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#71716A] mb-1.5">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === c ? 'scale-125 ring-2 ring-offset-2 ring-[#5A5A40]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateFolderOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#71716A] hover:bg-[#F5F5F0] rounded-[14px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
