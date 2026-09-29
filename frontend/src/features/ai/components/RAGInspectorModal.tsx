import React from 'react';
import { Brain, X } from 'lucide-react';

interface RAGInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: string | null;
}

export const RAGInspectorModal: React.FC<RAGInspectorModalProps> = ({
  isOpen,
  onClose,
  context,
}) => {
  if (!isOpen || !context) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md z-50 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden relative shadow-2xl max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-white">Retrieved RAG Workspace Context</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-black/25 text-xs font-mono text-zinc-400 whitespace-pre-wrap select-text leading-relaxed">
          {context}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
