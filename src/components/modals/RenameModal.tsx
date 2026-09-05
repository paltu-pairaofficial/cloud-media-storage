import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';

export const RenameModal: React.FC = () => {
  const { renameModalTarget, setRenameModalTarget, renameFile, renameFolder } = useDrive();

  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (renameModalTarget) {
      setNewName(renameModalTarget.name);
      setError('');
    }
  }, [renameModalTarget]);

  if (!renameModalTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError('Please provide a name');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      if (renameModalTarget.type === 'file') {
        await renameFile(renameModalTarget.id, newName.trim());
      } else {
        await renameFolder(renameModalTarget.id, newName.trim());
      }
      setRenameModalTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to rename item');
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
              <Edit2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif]">
              Rename {renameModalTarget.type === 'file' ? 'File' : 'Folder'}
            </h3>
          </div>

          <button
            onClick={() => setRenameModalTarget(null)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#71716A] mb-1.5">
              Item Name
            </label>
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F5F5F0] border border-[#E5E5DF] focus:border-[#5A5A40] focus:ring-4 focus:ring-[#5A5A40]/10 rounded-[14px] text-sm font-medium text-[#2D2D2A] outline-none transition-all placeholder:text-[#8E8E8A]"
            />
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRenameModalTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-[#71716A] hover:bg-[#F5F5F0] rounded-[14px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] disabled:opacity-50 text-white text-xs font-bold rounded-[14px] shadow-sm transition-all"
            >
              {isSubmitting ? 'Saving...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
