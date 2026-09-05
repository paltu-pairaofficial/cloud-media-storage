import React from 'react';
import { ChevronRight, HardDrive, Folder as FolderIcon } from 'lucide-react';
import { useDrive } from '../../context/DriveContext';

export const Breadcrumbs: React.FC = () => {
  const { currentTab, breadcrumbs, navigateToFolder, moveFile, moveFolder } = useDrive();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropOnBreadcrumb = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanTargetId = targetId === 'root' ? null : targetId;
    const fileId = e.dataTransfer.getData('application/file-id');
    const folderId = e.dataTransfer.getData('application/folder-id');

    if (fileId) {
      moveFile(fileId, cleanTargetId);
    } else if (folderId && folderId !== targetId) {
      moveFolder(folderId, cleanTargetId);
    }
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm font-medium text-[#71716A] flex-wrap select-none py-0.5">
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.id + '-' + idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#8E8E8A] shrink-0" />}
            <button
              onClick={() => {
                if (currentTab === 'my-drive') {
                  navigateToFolder(crumb.id === 'root' ? null : crumb.id);
                }
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnBreadcrumb(e, crumb.id)}
              disabled={isLast && currentTab === 'my-drive'}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                isLast
                  ? 'text-[#1A1A17] bg-[#EFEFEA] cursor-default'
                  : 'text-[#71716A] hover:text-[#2D2D2A] hover:bg-white cursor-pointer'
              }`}
            >
              {crumb.id === 'root' ? (
                <HardDrive className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
              ) : (
                <FolderIcon className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />
              )}
              <span className="truncate max-w-[200px]">{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
