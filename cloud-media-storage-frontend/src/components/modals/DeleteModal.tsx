import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';

export const DeleteModal: React.FC = () => {
  const {
    deleteModalTarget,
    setDeleteModalTarget,
    deleteFile,
    deleteFolder,
    permanentDeleteItem,
  } = useDrive();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!deleteModalTarget) return null;

  const isPermanent = deleteModalTarget.isPermanent;

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      if (isPermanent) {
        await permanentDeleteItem(deleteModalTarget.type, deleteModalTarget.id);
      } else {
        if (deleteModalTarget.type === 'file') {
          await deleteFile(deleteModalTarget.id);
        } else {
          await deleteFolder(deleteModalTarget.id);
        }
      }
      setDeleteModalTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2A]/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-[#E5E5DF] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center border ${
              isPermanent ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-[#F5F5F0] text-[#5A5A40] border-[#E5E5DF]'
            }`}>
              {isPermanent ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif]">
              {isPermanent ? 'Delete permanently?' : 'Move to Trash?'}
            </h3>
          </div>

          <button
            onClick={() => setDeleteModalTarget(null)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#71716A] leading-relaxed mb-4">
          {isPermanent ? (
            <>
              "<span className="font-semibold text-[#2D2D2A]">{deleteModalTarget.name}</span>" will be permanently deleted and cannot be recovered.
            </>
          ) : (
            <>
              "<span className="font-semibold text-[#2D2D2A]">{deleteModalTarget.name}</span>" will be moved to Trash. You can restore it anytime from the Trash tab.
            </>
          )}
        </p>

        {error && <p className="text-xs font-semibold text-rose-600 mb-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDeleteModalTarget(null)}
            className="px-4 py-2 text-xs font-semibold text-[#71716A] hover:bg-[#F5F5F0] rounded-[14px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className={`px-5 py-2 text-white text-xs font-bold rounded-[14px] shadow-sm transition-all ${
              isPermanent
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#5A5A40] hover:bg-[#4A4A33]'
            }`}
          >
            {isSubmitting ? 'Deleting...' : isPermanent ? 'Delete Forever' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
};
