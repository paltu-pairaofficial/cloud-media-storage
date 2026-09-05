import React from 'react';
import { X, Cloud, Image, Video, FileText, Music, Code2, Archive, HelpCircle } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { formatBytes } from '../../utils/formatters';

export const StorageBreakdownModal: React.FC = () => {
  const { isStorageModalOpen, setIsStorageModalOpen, stats } = useDrive();

  if (!isStorageModalOpen || !stats) return null;

  const categoryIcons: Record<string, any> = {
    image: Image,
    video: Video,
    document: FileText,
    audio: Music,
    code: Code2,
    archive: Archive,
    other: HelpCircle,
  };

  const categoryColors: Record<string, { bg: string; text: string; bar: string }> = {
    image: { bg: 'bg-[#5A5A40]/10', text: 'text-[#5A5A40]', bar: 'bg-[#5A5A40]' },
    video: { bg: 'bg-[#6B6554]/10', text: 'text-[#6B6554]', bar: 'bg-[#6B6554]' },
    document: { bg: 'bg-[#555E57]/10', text: 'text-[#555E57]', bar: 'bg-[#555E57]' },
    audio: { bg: 'bg-[#4A5D4E]/10', text: 'text-[#4A5D4E]', bar: 'bg-[#4A5D4E]' },
    code: { bg: 'bg-[#7D6B40]/10', text: 'text-[#7D6B40]', bar: 'bg-[#7D6B40]' },
    archive: { bg: 'bg-[#446761]/10', text: 'text-[#446761]', bar: 'bg-[#446761]' },
    other: { bg: 'bg-[#71716A]/10', text: 'text-[#71716A]', bar: 'bg-[#71716A]' },
  };

  const categories = Object.entries(stats.byCategory || {}) as [string, { count: number; bytes: number }][];

  return (
    <div className="fixed inset-0 z-50 bg-[#2D2D2A]/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div className="bg-white rounded-[28px] p-6 max-w-lg w-full shadow-2xl border border-[#E5E5DF] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-[#F5F5F0] text-[#5A5A40] border border-[#E5E5DF] flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2D2D2A] font-['Georgia',serif]">Storage Breakdown</h3>
              <p className="text-xs text-[#8E8E8A]">1 GB cloud storage breakdown</p>
            </div>
          </div>

          <button
            onClick={() => setIsStorageModalOpen(false)}
            className="p-1.5 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Progress Bar */}
        <div className="p-4 bg-[#F5F5F0] rounded-[18px] border border-[#E5E5DF] mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#2D2D2A]">
              {formatBytes(stats.totalBytes)} of {formatBytes(stats.limitBytes)} used
            </span>
            <span className="text-xs font-bold text-[#5A5A40]">{stats.percentage}%</span>
          </div>

          <div className="w-full h-3 bg-[#E5E5DF] rounded-full overflow-hidden flex">
            {categories.map(([cat, item]) => {
              const widthPct = stats.totalBytes > 0 ? (item.bytes / stats.limitBytes) * 100 : 0;
              const color = categoryColors[cat] || categoryColors.other;
              return (
                <div
                  key={cat}
                  style={{ width: `${Math.max(widthPct, 0.5)}%` }}
                  className={`h-full ${color.bar}`}
                  title={`${cat}: ${formatBytes(item.bytes)}`}
                />
              );
            })}
          </div>
        </div>

        {/* Detailed Breakdown List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {categories.map(([cat, item]) => {
            const Icon = categoryIcons[cat] || HelpCircle;
            const color = categoryColors[cat] || categoryColors.other;
            const pctOfUsed = stats.totalBytes > 0 ? Math.round((item.bytes / stats.totalBytes) * 100) : 0;

            return (
              <div
                key={cat}
                className="flex items-center justify-between p-3 rounded-[14px] bg-[#F5F5F0]/60 border border-[#E5E5DF] hover:border-[#5A5A40]/50 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${color.bg} ${color.text}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#2D2D2A] capitalize">{cat}</p>
                    <p className="text-[11px] text-[#8E8E8A]">
                      {item.count} file{item.count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-[#2D2D2A]">{formatBytes(item.bytes)}</p>
                  <p className="text-[11px] text-[#8E8E8A] font-medium">{pctOfUsed}% of used</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-[#E5E5DF] mt-4">
          <button
            onClick={() => setIsStorageModalOpen(false)}
            className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4A4A33] text-white text-xs font-bold rounded-[14px] shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
