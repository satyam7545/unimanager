import { create } from 'zustand';

export interface DocumentViewerState {
  isOpen: boolean;
  fileUrl: string | null;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  openPdf: (payload: { url: string; title: string; size?: number; type?: string }) => void;
  closePdf: () => void;
}

export const usePdfViewerStore = create<DocumentViewerState>((set) => ({
  isOpen: false,
  fileUrl: null,
  fileName: '',
  fileSize: undefined,
  fileType: undefined,
  openPdf: ({ url, title, size, type }) =>
    set({
      isOpen: true,
      fileUrl: url,
      fileName: title,
      fileSize: size,
      fileType: type,
    }),
  closePdf: () =>
    set({
      isOpen: false,
      fileUrl: null,
      fileName: '',
      fileSize: undefined,
      fileType: undefined,
    }),
}));
