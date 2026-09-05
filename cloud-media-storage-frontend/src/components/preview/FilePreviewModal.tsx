import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Star,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Copy,
  Check,
  FileText,
  FileImage,
  Video,
  Music,
  Code2,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useDrive } from '../../context/DriveContext';
import { formatBytes, formatDate, getFileCategory } from '../../utils/formatters';
import { api } from '../../services/api';

export const FilePreviewModal: React.FC = () => {
  const { previewFile, setPreviewFile, toggleStarFile, downloadFile, setShareModalTarget } = useDrive();

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);

    if (previewFile) {
      const category = getFileCategory(previewFile.mimeType, previewFile.name);
      if (category === 'code' || category === 'document' || previewFile.mimeType.startsWith('text/')) {
        setIsTextLoading(true);
        api
          .getFileTextContent(previewFile.id)
          .then((res) => {
            setTextContent(res.content);
          })
          .catch((err) => {
            console.warn('Could not load text preview:', err);
            setTextContent(null);
          })
          .finally(() => {
            setIsTextLoading(false);
          });
      }
    }
  }, [previewFile]);

  if (!previewFile) return null;

  const category = getFileCategory(previewFile.mimeType, previewFile.name);
  const streamUrl = api.getStreamUrl(previewFile.id);

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A1A18]/85 backdrop-blur-md flex flex-col select-none animate-in fade-in duration-150">
      {/* Top Bar */}
      <header className="h-16 px-4 flex items-center justify-between border-b border-[#3D3D38] bg-[#242421]/95 text-[#F5F5F0] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[14px] bg-[#2E2E2A] flex items-center justify-center shrink-0 border border-[#3D3D38]">
            {category === 'image' && <FileImage className="w-5 h-5 text-[#A5A58D]" />}
            {category === 'video' && <Video className="w-5 h-5 text-[#B7B7A4]" />}
            {category === 'audio' && <Music className="w-5 h-5 text-[#A3B18A]" />}
            {category === 'pdf' && <FileText className="w-5 h-5 text-[#DDBEA9]" />}
            {category === 'code' && <Code2 className="w-5 h-5 text-[#CB997E]" />}
            {(category === 'document' || category === 'archive' || category === 'other') && (
              <FileText className="w-5 h-5 text-[#A5A58D]" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate text-[#F5F5F0] max-w-xs sm:max-w-md font-['Georgia',serif]">
              {previewFile.name}
            </h2>
            <p className="text-[11px] text-[#A8A8A2]">
              {formatBytes(previewFile.size)} • {formatDate(previewFile.updatedAt)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom / Rotate Controls for Images */}
          {category === 'image' && (
            <div className="hidden sm:flex items-center gap-1 bg-[#2E2E2A] p-1 rounded-[14px] mr-2 border border-[#3D3D38]">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-1.5 hover:bg-[#3D3D38] rounded-[10px] text-[#D1D1CB] hover:text-white transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-1.5 hover:bg-[#3D3D38] rounded-[10px] text-[#D1D1CB] hover:text-white transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 hover:bg-[#3D3D38] rounded-[10px] text-[#D1D1CB] hover:text-white transition-colors"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Copy button for code/text */}
          {textContent !== null && (
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E2E2A] hover:bg-[#3D3D38] text-xs font-semibold rounded-[12px] text-[#F5F5F0] transition-colors border border-[#3D3D38]"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {/* Star Button */}
          <button
            onClick={() => toggleStarFile(previewFile.id)}
            className={`p-2 rounded-[12px] bg-[#2E2E2A] hover:bg-[#3D3D38] transition-colors border border-[#3D3D38] ${
              previewFile.isStarred ? 'text-amber-400' : 'text-[#D1D1CB] hover:text-white'
            }`}
            title={previewFile.isStarred ? 'Unstar' : 'Star'}
          >
            <Star className={`w-4 h-4 ${previewFile.isStarred ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Share Button */}
          <button
            onClick={() => {
              setShareModalTarget({ type: 'file', id: previewFile.id, name: previewFile.name });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E2E2A] hover:bg-[#3D3D38] text-xs font-semibold rounded-[12px] text-[#F5F5F0] transition-colors border border-[#3D3D38]"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Download Button */}
          <button
            onClick={() => downloadFile(previewFile)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#4A4A33] text-xs font-bold rounded-[12px] text-white shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          {/* Close Preview */}
          <button
            onClick={() => setPreviewFile(null)}
            className="p-2 text-[#A8A8A2] hover:text-white hover:bg-[#2E2E2A] rounded-[12px] transition-colors ml-2"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Preview Workspace */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8">
        {/* 1. Image Preview */}
        {category === 'image' && (
          <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden">
            <img
              src={streamUrl}
              alt={previewFile.name}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-out',
              }}
              className="max-h-[calc(100vh-10rem)] max-w-full object-contain rounded-[20px] shadow-2xl border border-[#3D3D38]"
            />
          </div>
        )}

        {/* 2. Video Player Preview */}
        {category === 'video' && (
          <div className="max-w-4xl w-full bg-black rounded-[24px] overflow-hidden shadow-2xl border border-[#3D3D38]">
            <video
              src={streamUrl}
              controls
              autoPlay
              className="w-full max-h-[calc(100vh-10rem)]"
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        )}

        {/* 3. Audio Player Preview */}
        {category === 'audio' && (
          <div className="max-w-lg w-full bg-[#242421] border border-[#3D3D38] p-8 rounded-[28px] shadow-2xl flex flex-col items-center gap-6 text-center">
            <div className="w-24 h-24 rounded-[20px] bg-[#5A5A40] flex items-center justify-center text-white shadow-lg">
              <Music className="w-12 h-12" />
            </div>

            <div className="min-w-0 w-full">
              <h3 className="text-base font-bold text-[#F5F5F0] font-['Georgia',serif] truncate">{previewFile.name}</h3>
              <p className="text-xs text-[#A8A8A2] mt-1">{formatBytes(previewFile.size)} • Audio Stream</p>
            </div>

            <audio src={streamUrl} controls autoPlay className="w-full accent-[#5A5A40]" />
          </div>
        )}

        {/* 4. PDF Viewer Preview */}
        {category === 'pdf' && (
          <div className="w-full max-w-5xl h-[calc(100vh-8rem)] bg-white rounded-[24px] overflow-hidden shadow-2xl flex flex-col border border-[#3D3D38]">
            <iframe
              src={streamUrl}
              title={previewFile.name}
              className="w-full h-full border-none"
            />
          </div>
        )}

        {/* 5. Text / Markdown / Code Content */}
        {textContent !== null && (
          <div className="w-full max-w-4xl h-[calc(100vh-8rem)] bg-[#242421] border border-[#3D3D38] rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-[#1C1C19] border-b border-[#3D3D38] flex items-center justify-between text-xs text-[#A8A8A2]">
              <span className="font-semibold text-[#F5F5F0]">{previewFile.name}</span>
              <span>{previewFile.mimeType}</span>
            </div>
            <pre className="p-5 flex-1 overflow-auto font-mono text-xs text-[#E5E5DF] leading-relaxed select-text whitespace-pre-wrap">
              {textContent}
            </pre>
          </div>
        )}

        {/* Loading text/code */}
        {isTextLoading && (
          <div className="flex flex-col items-center gap-3 text-[#A8A8A2]">
            <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
            <p className="text-xs font-medium">Reading file contents...</p>
          </div>
        )}

        {/* 6. Fallback Generic File Card */}
        {category === 'other' && !isTextLoading && (
          <div className="max-w-md w-full bg-[#242421] border border-[#3D3D38] p-8 rounded-[28px] shadow-2xl flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-[20px] bg-[#2E2E2A] flex items-center justify-center text-[#A8A8A2] border border-[#3D3D38]">
              <FileText className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-base font-bold text-[#F5F5F0] font-['Georgia',serif] truncate max-w-xs">{previewFile.name}</h3>
              <p className="text-xs text-[#A8A8A2] mt-1">
                {formatBytes(previewFile.size)} • No live preview available for this format
              </p>
            </div>

            <button
              onClick={() => downloadFile(previewFile)}
              className="mt-2 flex items-center gap-2 px-6 py-2.5 bg-[#5A5A40] hover:bg-[#4A4A33] text-xs font-bold text-white rounded-[14px] shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
