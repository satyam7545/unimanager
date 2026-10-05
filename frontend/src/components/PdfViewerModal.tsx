import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { usePdfViewerStore } from '@/store/pdfViewerStore';

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isPdf = (filename: string = '', fileType: string = ''): boolean => {
  return (
    filename.toLowerCase().endsWith('.pdf') ||
    fileType.toLowerCase().includes('pdf')
  );
};

const isImage = (filename: string = '', fileType: string = ''): boolean => {
  return (
    /\.(png|jpe?g|webp|gif|svg)$/i.test(filename) ||
    fileType.toLowerCase().startsWith('image/')
  );
};

export const PdfViewerModal: React.FC = () => {
  const { isOpen, fileUrl, fileName, fileSize, fileType, closePdf } = usePdfViewerStore();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state whenever new document is opened
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      setZoomLevel(100);
      setRotation(0);
    }
  }, [isOpen, fileUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          closePdf();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, closePdf]);

  if (!isOpen || !fileUrl) return null;

  const pdfDocument = isPdf(fileName, fileType || '');
  const imageDocument = isImage(fileName, fileType || '');

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 50));
  const handleResetZoom = () => setZoomLevel(100);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Open in external window / tab
  const handleOpenExternal = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  // Direct download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closePdf}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`relative z-10 flex flex-col bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
            isFullscreen
              ? 'w-full h-full rounded-none border-0'
              : 'w-full max-w-6xl h-[88vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-white/10 shrink-0 gap-3">
            {/* Title & Type Icon */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  pdfDocument
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : imageDocument
                    ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                    : 'bg-primary/10 border-primary/20 text-primary'
                }`}
              >
                {pdfDocument ? (
                  <FileText className="w-5 h-5" />
                ) : imageDocument ? (
                  <ImageIcon className="w-5 h-5" />
                ) : (
                  <File className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-bold text-zinc-100 truncate max-w-md tracking-tight"
                    title={fileName}
                  >
                    {fileName}
                  </h3>
                  {pdfDocument && (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
                      PDF
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {pdfDocument
                      ? 'PDF Document Viewer'
                      : imageDocument
                      ? 'Image Attachment'
                      : 'Attachment File'}
                  </span>
                  {fileSize && (
                    <>
                      <span className="text-zinc-600 text-xs">•</span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {formatFileSize(fileSize)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Toolbar Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Zoom Controls (Images & PDFs) */}
              {imageDocument && (
                <div className="flex items-center bg-zinc-800/80 rounded-lg p-0.5 border border-white/5 mr-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 text-xs font-mono text-zinc-300 hover:text-white font-medium"
                    title="Reset Zoom"
                  >
                    {zoomLevel}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-white/5 transition-colors border-l border-white/10"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Download copy button */}
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold border border-white/5 transition-all"
                title="Download a local copy"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Download</span>
              </button>

              {/* Open in external browser / OS window */}
              <button
                onClick={handleOpenExternal}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                title="Open in new window / external browser"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={closePdf}
                className="p-2 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all ml-1"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Viewer Body */}
          <div className="relative flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center select-none">
            {/* Loading Indicator */}
            {isLoading && !hasError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-zinc-400 font-semibold tracking-wide">
                  Loading document preview...
                </p>
              </div>
            )}

            {/* Error or Fallback View */}
            {hasError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-white mb-2">
                  Preview Not Available
                </h4>
                <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                  This document format or source cannot be embedded directly in the current window. You can open it in an external window or download it.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-lg shadow-primary/20 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in External Tab</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ) : pdfDocument ? (
              /* PDF In-App Frame */
              <iframe
                ref={iframeRef}
                src={`${fileUrl}#toolbar=1&navpanes=1&statusbar=1`}
                title={fileName}
                className="w-full h-full border-0 bg-zinc-950"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            ) : imageDocument ? (
              /* Image Attachment Viewer */
              <div className="w-full h-full flex items-center justify-center p-6 overflow-auto bg-zinc-950/60">
                <motion.img
                  src={fileUrl}
                  alt={fileName}
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                  }}
                />
              </div>
            ) : (
              /* Generic Document Fallback View */
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
                  <File className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white mb-1">{fileName}</h4>
                <p className="text-xs text-zinc-400 mb-6">
                  {formatFileSize(fileSize)} • Generic File Attachment
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Externally</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-lg shadow-primary/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
