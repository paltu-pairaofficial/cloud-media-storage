import React, { useState, useRef, useEffect } from 'react';
import {
  FileImage,
  Video,
  Music,
  FileText,
  Code2,
  Archive,
  File as FileIcon,
  MoreVertical,
  Star,
  Download,
  Share2,
  Edit2,
  FolderInput,
  Trash2,
  Eye,
  Info,
  RotateCcw,
  Play,
} from 'lucide-react';
import { FileItem } from '../../types';
import { useDrive } from '../../context/DriveContext';
import { formatBytes, formatDate, getFileCategory } from '../../utils/formatters';
import { api } from '../../services/api';

interface FileCardProps {
  file: FileItem;
  isTrash?: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({ file, isTrash = false }) => {
  const {
    selectedFileIds,
    toggleSelectFile,
    toggleStarFile,
    setPreviewFile,
    setShareModalTarget,
    setRenameModalTarget,
    setMoveModalTarget,
    setDeleteModalTarget,
    setDetailsModalTarget,
    downloadFile,
    restoreItem,
  } = useDrive();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedFileIds.includes(file.id);
  const category = getFileCategory(file.mimeType, file.name);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/file-id', file.id);
  };

  const renderThumbnail = () => {
    if (category === 'image' && !imageError) {
      return (
        <div className="w-full h-36 bg-slate-100 rounded-xl overflow-hidden relative group/img flex items-center justify-center">
          <img
            src={api.getStreamUrl(file.id)}
            alt={file.name}
            className={`w-full h-full object-cover transition-all duration-300 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            } group-hover/img:scale-105`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 animate-pulse">
              <FileImage className="w-8 h-8" />
            </div>
          )}
        </div>
      );
    }

    // Default icon cards for other categories
    const config = {
      image: { icon: FileImage, bg: 'bg-[#EAEAE2]', text: 'text-[#5A5A40]', badge: 'JPG/PNG' },
      video: { icon: Video, bg: 'bg-[#ECEBE4]', text: 'text-[#6B6554]', badge: 'VIDEO' },
      audio: { icon: Music, bg: 'bg-[#E5E8E0]', text: 'text-[#4A5D4E]', badge: 'AUDIO' },
      pdf: { icon: FileText, bg: 'bg-[#EFE8E1]', text: 'text-[#8C5E4E]', badge: 'PDF' },
      document: { icon: FileText, bg: 'bg-[#E9EAE5]', text: 'text-[#555E57]', badge: 'DOC' },
      code: { icon: Code2, bg: 'bg-[#EEECE1]', text: 'text-[#7D6B40]', badge: 'CODE' },
      archive: { icon: Archive, bg: 'bg-[#E2EBE8]', text: 'text-[#446761]', badge: 'ZIP' },
      other: { icon: FileIcon, bg: 'bg-[#ECECE6]', text: 'text-[#6F6F6B]', badge: 'FILE' },
    }[category];

    const Icon = config.icon;

    return (
      <div className={`w-full h-36 ${config.bg} rounded-[18px] flex flex-col items-center justify-center relative group/media transition-all`}>
        <div className={`w-12 h-12 rounded-2xl bg-white/90 shadow-2xs flex items-center justify-center ${config.text} group-hover/media:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>

        <span className="mt-2 text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/90 text-[#5A5A40] border border-[#E5E5DF]/80 shadow-2xs">
          {file.metadata?.extension || config.badge}
        </span>

        {category === 'video' && (
          <div className="absolute inset-0 bg-[#2D2D2A]/15 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity rounded-[18px]">
            <div className="w-10 h-10 rounded-full bg-white/95 text-[#2D2D2A] flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 fill-[#2D2D2A] ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      draggable={!isTrash}
      onDragStart={handleDragStart}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        toggleSelectFile(file.id, e.ctrlKey || e.metaKey || e.shiftKey);
      }}
      onDoubleClick={() => {
        if (!isTrash) setPreviewFile(file);
      }}
      className={`group relative flex flex-col p-3 rounded-[24px] border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-[#5A5A40]/10 border-[#5A5A40] ring-2 ring-[#5A5A40]/20 shadow-xs'
          : 'bg-white hover:bg-white border-[#E5E5DF] hover:border-[#5A5A40]/40 shadow-2xs hover:shadow-xl hover:shadow-[#5A5A40]/5 hover:-translate-y-0.5'
      }`}
    >
      {/* Media Thumbnail */}
      {renderThumbnail()}

      {/* Title & Metadata row */}
      <div className="mt-3 flex items-start justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-semibold text-[#2D2D2A] truncate group-hover:text-[#5A5A40] transition-colors"
            title={file.name}
          >
            {file.name}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8E8E8A] font-medium mt-0.5">
            <span>{formatBytes(file.size)}</span>
            <span>•</span>
            <span>{formatDate(file.updatedAt)}</span>
            {file.sharedRole && (
              <span className="text-[#5A5A40] font-semibold">• {file.sharedRole}</span>
            )}
          </div>
        </div>

        {/* 3-dots Context Menu Button */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 text-[#8E8E8A] hover:text-[#2D2D2A] hover:bg-[#F5F5F0] rounded-full transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-[#E5E5DF] py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              {!isTrash ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(file);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Eye className="w-4 h-4 text-[#5A5A40]" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Download className="w-4 h-4 text-[#5A5A40]" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareModalTarget({ type: 'file', id: file.id, name: file.name });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Share2 className="w-4 h-4 text-[#5A5A40]" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStarFile(file.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        file.isStarred ? 'text-amber-500 fill-amber-400' : 'text-[#8E8E8A]'
                      }`}
                    />
                    <span>{file.isStarred ? 'Unstar' : 'Add to Starred'}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameModalTarget({ type: 'file', id: file.id, name: file.name });
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
                      setMoveModalTarget({ type: 'file', id: file.id, name: file.name });
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <FolderInput className="w-4 h-4 text-[#71716A]" />
                    <span>Move</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsModalTarget(file);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[#2D2D2A] hover:bg-[#F5F5F0] font-medium text-left"
                  >
                    <Info className="w-4 h-4 text-[#71716A]" />
                    <span>File Details</span>
                  </button>

                  <div className="h-px bg-[#E5E5DF] my-1" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalTarget({ type: 'file', id: file.id, name: file.name });
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
                      restoreItem('file', file.id);
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
                      setDeleteModalTarget({ type: 'file', id: file.id, name: file.name, isPermanent: true });
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

      {/* Floating Star indicator on top-right */}
      {!isTrash && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStarFile(file.id);
          }}
          className={`absolute top-4 right-4 p-1.5 rounded-full bg-white/90 backdrop-blur-xs shadow-2xs transition-all ${
            file.isStarred
              ? 'text-amber-500 opacity-100'
              : 'text-[#8E8E8A] opacity-0 group-hover:opacity-100 hover:text-amber-500'
          }`}
          title={file.isStarred ? 'Unstar' : 'Star'}
        >
          <Star
            className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400' : ''}`}
          />
        </button>
      )}
    </div>
  );
};
