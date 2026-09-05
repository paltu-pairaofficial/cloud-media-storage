import React from 'react';
import {
  FileImage,
  Video,
  Music,
  FileText,
  Code2,
  Archive,
  File as FileIcon,
  Folder as FolderIcon,
  MoreVertical,
  Star,
  Download,
  Share2,
  Edit2,
  Trash2,
  Eye,
  Info,
  RotateCcw,
  Check,
} from 'lucide-react';
import { Folder, FileItem } from '../../types';
import { useDrive } from '../../context/DriveContext';
import { formatBytes, formatDate, getFileCategory } from '../../utils/formatters';

interface FileListProps {
  folders: Folder[];
  files: FileItem[];
  isTrash?: boolean;
}

export const FileList: React.FC<FileListProps> = ({ folders, files, isTrash = false }) => {
  const {
    navigateToFolder,
    selectedFileIds,
    selectedFolderIds,
    toggleSelectFile,
    toggleSelectFolder,
    toggleStarFolder,
    toggleStarFile,
    setPreviewFile,
    setShareModalTarget,
    setRenameModalTarget,
    setMoveModalTarget,
    setDeleteModalTarget,
    setDetailsModalTarget,
    downloadFile,
    restoreItem,
    moveFile,
    moveFolder,
  } = useDrive();

  const getFileIcon = (file: FileItem) => {
    const category = getFileCategory(file.mimeType, file.name);
    const config = {
      image: { icon: FileImage, color: 'text-[#5A5A40]' },
      video: { icon: Video, color: 'text-[#6B6554]' },
      audio: { icon: Music, color: 'text-[#4A5D4E]' },
      pdf: { icon: FileText, color: 'text-[#8C5E4E]' },
      document: { icon: FileText, color: 'text-[#555E57]' },
      code: { icon: Code2, color: 'text-[#7D6B40]' },
      archive: { icon: Archive, color: 'text-[#446761]' },
      other: { icon: FileIcon, color: 'text-[#6F6F6B]' },
    }[category];

    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color} shrink-0`} />;
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#E5E5DF] shadow-2xs overflow-hidden select-none">
      <table className="w-full text-left text-xs text-[#71716A]">
        <thead className="bg-[#F5F5F0] border-b border-[#E5E5DF] text-[11px] font-bold text-[#8E8E8A] uppercase tracking-wider">
          <tr>
            <th className="py-3.5 px-4 w-10"></th>
            <th className="py-3.5 px-4 font-semibold text-[#2D2D2A]">Name</th>
            <th className="py-3.5 px-4 hidden sm:table-cell">Owner</th>
            <th className="py-3.5 px-4 hidden md:table-cell">Last Modified</th>
            <th className="py-3.5 px-4 hidden sm:table-cell">File Size</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5DF]/60 font-medium">
          {/* Folders Rows */}
          {folders.map((folder) => {
            const isSelected = selectedFolderIds.includes(folder.id);
            return (
              <tr
                key={folder.id}
                draggable={!isTrash}
                onDragStart={(e) => e.dataTransfer.setData('application/folder-id', folder.id)}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  toggleSelectFolder(folder.id, e.ctrlKey || e.metaKey || e.shiftKey);
                }}
                onDoubleClick={() => {
                  if (!isTrash) navigateToFolder(folder.id);
                }}
                className={`group hover:bg-[#F9F9F7] cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#5A5A40]/10 text-[#2D2D2A]' : ''
                }`}
              >
                {/* Star & Selection toggle */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFolder(folder.id, true);
                      }}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#5A5A40] text-white shadow-xs opacity-100'
                          : selectedFolderIds.length > 0 || selectedFileIds.length > 0
                          ? 'border border-[#D1D1CB] text-transparent hover:border-[#5A5A40] opacity-80 hover:opacity-100'
                          : 'border border-[#D1D1CB] text-transparent hover:border-[#5A5A40] opacity-0 group-hover:opacity-100'
                      }`}
                      title={isSelected ? 'Deselect folder' : 'Select folder'}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    {!isTrash && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarFolder(folder.id);
                        }}
                        className={`p-1 rounded-full transition-colors ${
                          folder.isStarred
                            ? 'text-amber-500'
                            : 'text-[#D1D1CB] hover:text-[#8E8E8A] opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${folder.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </td>

                {/* Name */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-[12px] bg-[#F5F5F0] border border-[#E5E5DF]/70 flex items-center justify-center shrink-0"
                      style={{
                        color: folder.color && folder.color !== '#3b82f6' ? folder.color : '#5A5A40',
                      }}
                    >
                      <FolderIcon className="w-4 h-4 fill-current" />
                    </div>
                    <span className="font-semibold text-[#2D2D2A] truncate max-w-xs md:max-w-md group-hover:text-[#5A5A40] transition-colors">
                      {folder.name}
                    </span>
                  </div>
                </td>

                {/* Owner */}
                <td className="py-3.5 px-4 hidden sm:table-cell text-[#71716A]">
                  {folder.ownerName || 'me'}
                </td>

                {/* Date */}
                <td className="py-3.5 px-4 hidden md:table-cell text-[#8E8E8A]">
                  {formatDate(folder.updatedAt)}
                </td>

                {/* Size */}
                <td className="py-3.5 px-4 hidden sm:table-cell text-[#8E8E8A]">
                  {folder.itemCount !== undefined ? `${folder.itemCount} items` : '—'}
                </td>

                {/* Quick Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isTrash ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalTarget({ type: 'folder', id: folder.id, name: folder.name });
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreItem('folder', folder.id);
                        }}
                        className="p-1.5 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-full transition-colors"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {/* Files Rows */}
          {files.map((file) => {
            const isSelected = selectedFileIds.includes(file.id);
            return (
              <tr
                key={file.id}
                draggable={!isTrash}
                onDragStart={(e) => e.dataTransfer.setData('application/file-id', file.id)}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  toggleSelectFile(file.id, e.ctrlKey || e.metaKey || e.shiftKey);
                }}
                onDoubleClick={() => {
                  if (!isTrash) setPreviewFile(file);
                }}
                className={`group hover:bg-[#F9F9F7] cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#5A5A40]/10 text-[#2D2D2A]' : ''
                }`}
              >
                {/* Star & Selection toggle */}
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFile(file.id, true);
                      }}
                      className={`w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#5A5A40] text-white shadow-xs opacity-100'
                          : selectedFolderIds.length > 0 || selectedFileIds.length > 0
                          ? 'border border-[#D1D1CB] text-transparent hover:border-[#5A5A40] opacity-80 hover:opacity-100'
                          : 'border border-[#D1D1CB] text-transparent hover:border-[#5A5A40] opacity-0 group-hover:opacity-100'
                      }`}
                      title={isSelected ? 'Deselect file' : 'Select file'}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </button>
                    {!isTrash && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarFile(file.id);
                        }}
                        className={`p-1 rounded-full transition-colors ${
                          file.isStarred
                            ? 'text-amber-500'
                            : 'text-[#D1D1CB] hover:text-[#8E8E8A] opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
                    )}
                  </div>
                </td>

                {/* Name & Icon */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[12px] bg-[#F5F5F0] border border-[#E5E5DF]/70 flex items-center justify-center shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <span className="font-semibold text-[#2D2D2A] truncate max-w-xs md:max-w-md group-hover:text-[#5A5A40] transition-colors">
                      {file.name}
                    </span>
                  </div>
                </td>

                {/* Owner */}
                <td className="py-3.5 px-4 hidden sm:table-cell text-[#71716A]">
                  {file.ownerName || 'me'}
                </td>

                {/* Date */}
                <td className="py-3.5 px-4 hidden md:table-cell text-[#8E8E8A]">
                  {formatDate(file.updatedAt)}
                </td>

                {/* Size */}
                <td className="py-3.5 px-4 hidden sm:table-cell text-[#8E8E8A]">
                  {formatBytes(file.size)}
                </td>

                {/* Quick Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isTrash ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalTarget({ type: 'file', id: file.id, name: file.name });
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModalTarget({ type: 'file', id: file.id, name: file.name });
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-[#5A5A40] hover:bg-[#F5F5F0] rounded-full transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModalTarget({ type: 'file', id: file.id, name: file.name });
                          }}
                          className="p-1.5 text-[#8E8E8A] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreItem('file', file.id);
                        }}
                        className="p-1.5 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-full transition-colors"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
