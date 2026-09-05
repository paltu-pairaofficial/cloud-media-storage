import React from 'react';
import { X, Info, Download, Share2, Star, HardDrive, Calendar, FileText } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { formatBytes, formatDate } from '../../utils/formatters';

export const FileDetailsModal: React.FC = () => {
  const { detailsModalTarget, setDetailsModalTarget, downloadFile, setShareModalTarget, toggleStarFile } = useDrive();

  if (!detailsModalTarget) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2A]/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div className="bg-white rounded-[28px] p-6 max-w-md w-full shadow-2xl border border-[#E5E5DF] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-[#F5F5F0] text-[#5A5A40] border border-[#E5E5DF] flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif]">File Details</h3>
          </div>

          <button
            onClick={() => setDetailsModalTarget(null)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File Inspector Info Table */}
        <div className="space-y-3 py-2 text-xs">
          <div className="flex items-start justify-between gap-4 p-3 rounded-[16px] bg-[#F5F5F0] border border-[#E5E5DF]">
            <div>
              <p className="font-bold text-[#2D2D2A] break-all">{detailsModalTarget.name}</p>
              <p className="text-[11px] text-[#8E8E8A] font-mono mt-0.5">{detailsModalTarget.mimeType}</p>
            </div>
            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-white rounded-md border border-[#E5E5DF] text-[#71716A]">
              {detailsModalTarget.metadata?.extension || 'FILE'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[#71716A]">
            <div className="p-3 bg-[#F5F5F0] rounded-[16px] border border-[#E5E5DF]/70">
              <span className="text-[10px] uppercase font-bold text-[#8E8E8A] block mb-1">File Size</span>
              <span className="font-bold text-[#2D2D2A] text-sm">{formatBytes(detailsModalTarget.size)}</span>
            </div>

            <div className="p-3 bg-[#F5F5F0] rounded-[16px] border border-[#E5E5DF]/70">
              <span className="text-[10px] uppercase font-bold text-[#8E8E8A] block mb-1">Starred Status</span>
              <span className="font-bold text-[#2D2D2A] text-sm">
                {detailsModalTarget.isStarred ? '⭐ Starred' : 'Not starred'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#F5F5F0] rounded-[16px] border border-[#E5E5DF]/70 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8E8E8A] font-medium">Uploaded Date</span>
              <span className="font-semibold text-[#2D2D2A]">{formatDate(detailsModalTarget.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8E8E8A] font-medium">Last Modified</span>
              <span className="font-semibold text-[#2D2D2A]">{formatDate(detailsModalTarget.updatedAt)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#8E8E8A] font-medium">Storage ID</span>
              <span className="font-mono text-[10px] text-[#71716A] truncate max-w-[180px]">
                {detailsModalTarget.id}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#E5E5DF] mt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleStarFile(detailsModalTarget.id)}
              className="p-2 text-[#71716A] hover:text-amber-500 hover:bg-[#F5F5F0] rounded-full transition-colors"
              title="Star"
            >
              <Star className={`w-4 h-4 ${detailsModalTarget.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>
            <button
              onClick={() => {
                setShareModalTarget({ type: 'file', id: detailsModalTarget.id, name: detailsModalTarget.name });
                setDetailsModalTarget(null);
              }}
              className="p-2 text-[#71716A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDetailsModalTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-[#71716A] hover:bg-[#F5F5F0] rounded-[14px] transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => downloadFile(detailsModalTarget)}
              className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[14px] flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
