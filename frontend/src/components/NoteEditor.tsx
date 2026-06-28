import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Pin, Star, CheckCircle, CloudLightning, RefreshCw, Eye, Edit3, Tag as TagIcon, Paperclip, Download, Plus, Trash2 } from 'lucide-react';
import { api, API_HOST } from '@/services/api';

interface NoteEditorProps {
  noteId: string | null;
  onClose?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ noteId }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [semester, setSemester] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [editTab, setEditTab] = useState<'write' | 'preview'>('write');
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [isUploading, setIsUploading] = useState(false);

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('noteId', noteId!);
      return api.post('/attachments/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteDetails', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attId: string) => {
      return api.delete(`/attachments/${attId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteDetails', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    uploadAttachmentMutation.mutate(file, {
      onSettled: () => {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      },
    });
  };

  const prevNoteIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  // 1. Fetch current note data
  const { data: noteResponse, isLoading } = useQuery({
    queryKey: ['noteDetails', noteId],
    queryFn: async () => {
      if (!noteId) return null;
      const res = await api.get(`/notes/${noteId}`);
      return res.data.note;
    },
    enabled: !!noteId,
  });

  // 2. Fetch subjects list for dropdown selection
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.subjects;
    },
  });

  // 3. Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!noteId) return;
      return api.put(`/notes/${noteId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['noteDetails', noteId] });
      setSyncState('saved');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: () => {
      setSyncState('error');
    },
  });

  // Load note values when active noteId changes
  useEffect(() => {
    if (noteResponse && noteId === noteResponse.id) {
      setTitle(noteResponse.title || '');
      setContent(noteResponse.content || '');
      setIsPinned(noteResponse.isPinned || false);
      setIsFavorite(noteResponse.isFavorite || false);
      setSubjectId(noteResponse.subjectId || null);
      setSemester(noteResponse.semester || null);
      
      const tagNames = noteResponse.tags ? noteResponse.tags.map((t: any) => t.name).join(', ') : '';
      setTagsInput(tagNames);

      prevNoteIdRef.current = noteId;
      isDirtyRef.current = false;
      setSyncState('idle');
    }
  }, [noteResponse, noteId]);

  // Debounced Autosave Logic
  useEffect(() => {
    // Skip autosave check if noteId is empty, or if we just loaded/swapped notes
    if (!noteId) return;
    if (prevNoteIdRef.current !== noteId) return;

    if (!isDirtyRef.current) return;

    setSyncState('saving');

    const debounceTimer = setTimeout(() => {
      const tagList = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      updateNoteMutation.mutate({
        title,
        content,
        isPinned,
        isFavorite,
        subjectId: subjectId || null,
        semester: semester || null,
        tags: tagList,
      });
      isDirtyRef.current = false;
    }, 1500);

    return () => clearTimeout(debounceTimer);
  }, [title, content, isPinned, isFavorite, subjectId, semester, tagsInput, noteId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    isDirtyRef.current = true;
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    isDirtyRef.current = true;
  };

  // Simple, custom Markdown parsing renderer for previewing
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-zinc-500 italic text-sm">Write something in markdown...</p>;

    // Split text into lines
    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      // Code Blocks parser
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          insideCodeBlock = false;
          const block = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={idx} className="bg-black/30 border border-white/5 p-4 rounded-lg my-3 overflow-x-auto text-xs text-zinc-300 font-mono">
              <code>{block}</code>
            </pre>
          );
        } else {
          insideCodeBlock = true;
          return null;
        }
      }

      if (insideCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // Headers parser
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-extrabold text-white mt-5 mb-2 border-b border-white/5 pb-1">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-semibold text-zinc-200 mt-3 mb-1.5">{line.slice(4)}</h3>;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-4 py-1.5 my-3 bg-white/[0.01] text-zinc-300 italic text-sm">
            {line.slice(2)}
          </blockquote>
        );
      }

      // Bullet lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-sm text-zinc-300">
            <li>{line.slice(2)}</li>
          </ul>
        );
      }

      // Simple formatting parser (Bold, Italic)
      let parsedLine: React.ReactNode = line;
      if (line.includes('**')) {
        const parts = line.split('**');
        parsedLine = parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-extrabold text-white">{part}</strong> : part));
      }

      return (
        <p key={idx} className="text-sm text-zinc-300 leading-relaxed min-h-[1.25rem] my-1">
          {parsedLine}
        </p>
      );
    });
  };

  if (!noteId) {
    return (
      <div className="h-full flex items-center justify-center text-center p-6 border border-white/5 bg-black/15 rounded-2xl">
        <div>
          <Eye className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg">No Active Note</h3>
          <p className="text-sm text-zinc-500 mt-1">Select a note from the explorer sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center animate-pulse">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Editor Header Status Controls */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0 bg-black/20">
        <div className="flex items-center gap-1.5 text-xs font-semibold select-none">
          {syncState === 'saving' && (
            <span className="text-zinc-500 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {syncState === 'saved' && (
            <span className="text-emerald-500 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Saved changes</span>
            </span>
          )}
          {syncState === 'error' && (
            <span className="text-red-400 flex items-center gap-1.5">
              <CloudLightning className="w-3.5 h-3.5" />
              <span>Save failed</span>
            </span>
          )}
          {syncState === 'idle' && (
            <span className="text-zinc-500">Auto-saved to cloud</span>
          )}
        </div>

        {/* Action Toggles */}
        <div className="flex items-center gap-2">
          {/* Write / Preview Tab switcher */}
          <div className="flex items-center border border-white/5 bg-white/[0.02] p-0.5 rounded-lg mr-2">
            <button
              onClick={() => setEditTab('write')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                editTab === 'write' ? 'text-white bg-primary/20 shadow-inner' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              onClick={() => setEditTab('preview')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                editTab === 'preview' ? 'text-white bg-primary/20 shadow-inner' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Favorite toggle */}
          <button
            onClick={() => {
              setIsFavorite(!isFavorite);
              isDirtyRef.current = true;
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
                : 'border-white/5 text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
            title="Favorite"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-500' : ''}`} />
          </button>

          {/* Pin toggle */}
          <button
            onClick={() => {
              setIsPinned(!isPinned);
              isDirtyRef.current = true;
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isPinned
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-white/5 text-zinc-500 hover:text-white hover:bg-white/5'
            }`}
            title="Pin Note"
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Title Input area */}
      <div className="p-4 border-b border-white/5 shrink-0 bg-black/10 flex flex-col md:flex-row md:items-center gap-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled Note"
          className="flex-1 bg-transparent text-xl font-extrabold text-white placeholder-zinc-600 focus:outline-none border-b border-transparent focus:border-white/10 pb-0.5"
        />

        {/* Metadata binds: Subject and Tags */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Subject:</span>
            <select
              value={subjectId || ''}
              onChange={(e) => {
                const val = e.target.value || null;
                setSubjectId(val);
                if (val) {
                  const selectedSub = subjects?.find((sub: any) => sub.id === val);
                  if (selectedSub?.semester) {
                    setSemester(selectedSub.semester);
                  }
                }
                isDirtyRef.current = true;
              }}
              className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">None</option>
              {subjects?.map((sub: any) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Semester:</span>
            <select
              value={semester || ''}
              onChange={(e) => {
                setSemester(e.target.value || null);
                isDirtyRef.current = true;
              }}
              className="bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              <option value="">None</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Tags list */}
          <div className="flex items-center gap-1.5">
            <TagIcon className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => {
                setTagsInput(e.target.value);
                isDirtyRef.current = true;
              }}
              placeholder="tags (comma separated)"
              className="bg-transparent border border-white/5 hover:border-white/10 focus:border-primary/40 rounded px-2 py-0.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition-all w-32 md:w-44"
            />
          </div>
        </div>
      </div>

      {/* Editing / Preview Content Panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {editTab === 'write' ? (
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Write notes here... (Markdown tags supported: # Headers, - Lists, **Bold**, ```Code blocks)"
            className="w-full h-full bg-transparent text-sm text-zinc-300 placeholder-zinc-600 resize-none focus:outline-none leading-relaxed font-mono"
          />
        ) : (
          <div className="prose prose-invert max-w-none text-zinc-300 h-full overflow-y-auto space-y-3">
            {renderMarkdown(content)}
          </div>
        )}
      </div>

      {/* Attachments Section */}
      <div className="border-t border-white/5 bg-black/20 p-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
            <span>Attachments ({(noteResponse as any)?.attachments?.length || 0})</span>
          </div>
          
          <label className="cursor-pointer text-[10px] px-2.5 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary font-bold border border-primary/30 transition-all flex items-center gap-1">
            {isUploading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            <span>Upload File</span>
            <input type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} />
          </label>
        </div>

        {!(noteResponse as any)?.attachments || (noteResponse as any).attachments.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">No attachments added yet. Upload PDFs, documents, or images.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {(noteResponse as any).attachments.map((att: any) => {
              const fileUrl = `${API_HOST}${att.filePath}`;
              return (
                <div key={att.id} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all text-xs max-w-xs truncate group">
                  <span className="truncate text-zinc-300 font-medium" title={att.fileName}>{att.fileName}</span>
                  <span className="text-[10px] text-zinc-500 shrink-0">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <a href={fileUrl} target="_blank" rel="noreferrer" download className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/5 transition-colors" title="Download">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => { if (window.confirm(`Delete ${att.fileName}?`)) deleteAttachmentMutation.mutate(att.id); }} className="p-1 text-zinc-600 hover:text-red-400 rounded hover:bg-white/5 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
