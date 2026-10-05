import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Eye,
  Trash2,
  Paperclip
} from 'lucide-react';
import { usePdfViewerStore } from '@/store/pdfViewerStore';
import { API_HOST } from '@/services/api';

export interface AttachmentData {
  id: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  fileType?: string;
}

export const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isPdfFile = (fileName: string = '', fileType: string = ''): boolean => {
  return fileName.toLowerCase().endsWith('.pdf') || fileType.toLowerCase().includes('pdf');
};

export const isImageFile = (fileName: string = '', fileType: string = ''): boolean => {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName) || fileType.toLowerCase().startsWith('image/');
};

/**
 * Compact Attachment Pill — ideal for assignment cards, kanban tiles, and note snippets
 */
export const AttachmentPill: React.FC<{
  attachment: AttachmentData;
  className?: string;
  compact?: boolean;
}> = ({ attachment, className = '', compact = false }) => {
  const { openPdf } = usePdfViewerStore();
  const fileUrl = `${API_HOST}${attachment.filePath}`;
  const isPdf = isPdfFile(attachment.fileName, attachment.fileType);
  const isImg = isImageFile(attachment.fileName, attachment.fileType);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPdf({
      url: fileUrl,
      title: attachment.fileName,
      size: attachment.fileSize,
      type: attachment.fileType,
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={`Click to preview ${attachment.fileName} in app`}
      className={`group/pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none ${
        isPdf
          ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border-rose-500/20 hover:border-rose-500/40 shadow-sm shadow-rose-950/30'
          : isImg
          ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 border-sky-500/20 hover:border-sky-500/40'
          : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5 hover:border-white/15'
      } ${className}`}
    >
      {isPdf ? (
        <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0 group-hover/pill:scale-110 transition-transform" />
      ) : isImg ? (
        <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0 group-hover/pill:scale-110 transition-transform" />
      ) : (
        <Paperclip className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      )}

      <span
        className={`font-medium tracking-tight truncate ${
          compact ? 'max-w-[110px] text-[10px]' : 'max-w-[150px] text-xs'
        }`}
      >
        {attachment.fileName}
      </span>

      {isPdf && (
        <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 shrink-0">
          PDF
        </span>
      )}

      {attachment.fileSize && !compact && (
        <span className="text-[10px] text-zinc-500 font-mono shrink-0 hidden sm:inline">
          {formatBytes(attachment.fileSize)}
        </span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover/pill:opacity-100 transition-opacity ml-0.5">
        <span className="p-0.5 rounded text-zinc-400 hover:text-white" title="Preview in App">
          <Eye className="w-3 h-3" />
        </span>
        <button
          type="button"
          onClick={handleDownload}
          className="p-0.5 rounded text-zinc-400 hover:text-white"
          title="Download Copy"
        >
          <Download className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

/**
 * Rich Attachment Card — ideal for Note Editor, Assignment modals, and detail dialogs
 */
export const AttachmentCard: React.FC<{
  attachment: AttachmentData;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}> = ({ attachment, onDelete, isDeleting = false }) => {
  const { openPdf } = usePdfViewerStore();
  const fileUrl = `${API_HOST}${attachment.filePath}`;
  const isPdf = isPdfFile(attachment.fileName, attachment.fileType);
  const isImg = isImageFile(attachment.fileName, attachment.fileType);

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPdf({
      url: fileUrl,
      title: attachment.fileName,
      size: attachment.fileSize,
      type: attachment.fileType,
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative flex items-center justify-between p-3 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900/90 hover:border-white/10 transition-all duration-200">
      {/* File Info */}
      <div
        onClick={handlePreview}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
        title="Click to preview in app"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
            isPdf
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-sm shadow-rose-950/40'
              : isImg
              ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
              : 'bg-primary/10 border-primary/20 text-primary'
          }`}
        >
          {isPdf ? (
            <FileText className="w-5 h-5" />
          ) : isImg ? (
            <ImageIcon className="w-5 h-5" />
          ) : (
            <File className="w-5 h-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
              {attachment.fileName}
            </span>
            {isPdf && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                PDF
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-zinc-500">
              {isPdf ? 'PDF Document' : isImg ? 'Image' : 'File'}
            </span>
            {attachment.fileSize && (
              <>
                <span className="text-zinc-700 text-xs">•</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatBytes(attachment.fileSize)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1.5 ml-3 shrink-0">
        <button
          type="button"
          onClick={handlePreview}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all hover:scale-105 active:scale-95"
          title="Preview in app"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
          title="Download a copy"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete ${attachment.fileName}?`)) {
                onDelete(attachment.id);
              }
            }}
            disabled={isDeleting}
            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
            title="Delete file"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
