import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  File as FileIcon,
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { formatBytes } from '../../utils/formatters';

export const UploadZone: React.FC = () => {
  const { uploadQueue, uploadFiles, dismissUploadItem, clearCompletedUploads } = useDrive();

  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  // Global window drag & drop event listener
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsWindowDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [uploadFiles]);

  const activeCount = uploadQueue.filter((u) => u.status === 'uploading').length;
  const completedCount = uploadQueue.filter((u) => u.status === 'completed').length;

  return (
    <>
      {/* Full-screen Drag & Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none animate-in fade-in duration-150">
          <div className="bg-white/95 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-dashed border-blue-500 text-center flex flex-col items-center gap-3 scale-105 transition-transform">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Drop files to upload</h3>
            <p className="text-xs text-slate-500 font-medium">
              Release anywhere to instantly upload to the current folder
            </p>
          </div>
        </div>
      )}

      {/* Floating Upload Progress Drawer */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-5 right-5 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden select-none animate-in slide-in-from-bottom-5 duration-200">
          {/* Header Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeCount > 0 ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-semibold">
                {activeCount > 0
                  ? `Uploading ${activeCount} file${activeCount === 1 ? '' : 's'}...`
                  : `${completedCount} upload${completedCount === 1 ? '' : 's'} completed`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-300 hover:text-white"
                title={isDrawerCollapsed ? 'Expand' : 'Collapse'}
              >
                {isDrawerCollapsed ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={clearCompletedUploads}
                className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-300 hover:text-white"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Itemized Upload List */}
          {!isDrawerCollapsed && (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
              {uploadQueue.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center gap-3 text-xs">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                    <FileIcon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="font-semibold text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatBytes(item.size)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {item.status === 'uploading' && (
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-150"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Uploaded</span>
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{item.error || 'Failed'}</span>
                      </div>
                    )}
                  </div>

                  {/* Dismiss Item */}
                  <button
                    onClick={() => dismissUploadItem(item.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
