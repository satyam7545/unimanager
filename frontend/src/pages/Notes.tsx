import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderPlus, FilePlus2, Trash2, Search, Pin, Star, FileText } from 'lucide-react';
import { api } from '@/services/api';
import { NoteEditor } from '@/components/NoteEditor';

export const Notes: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');

  // 0. Handle redirect deep linking
  React.useEffect(() => {
    const redirectedNoteId = localStorage.getItem('selectedNoteId');
    if (redirectedNoteId) {
      setSelectedNoteId(redirectedNoteId);
      localStorage.removeItem('selectedNoteId');
    }
  }, []);

  // 1. Fetch folders
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await api.get('/folders');
      return res.data.folders;
    },
  });

  // 2. Fetch notes
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', searchQuery, activeFolderId],
    queryFn: async () => {
      let url = '/notes?';
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (activeFolderId) {
        url += `folderId=${activeFolderId}&`;
      }
      const res = await api.get(url);
      return res.data.notes;
    },
  });

  // 3. Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; folderId?: string | null }) => {
      return api.post('/notes', data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNoteId(res.data.note.id);
    },
  });

  // 4. Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return api.post('/folders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setFolderName('');
      setShowFolderModal(false);
    },
  });

  // 5. Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/folders/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      if (activeFolderId === id) {
        setActiveFolderId(null);
      }
    },
  });

  // 6. Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/notes/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
      }
    },
  });

  const toggleFolder = (id: string) => {
    setActiveFolderId(id);
  };

  const handleCreateNote = () => {
    createNoteMutation.mutate({
      title: 'Untitled Note',
      folderId: activeFolderId,
    });
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    createFolderMutation.mutate({ name: folderName });
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this folder? Notes inside will not be deleted but moved to Unsorted.')) {
      deleteFolderMutation.mutate(id);
    }
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(id);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-6 select-none relative">
      {/* 1. Left Explorer Sidebar panel */}
      <div className="w-80 shrink-0 flex flex-col border border-white/5 bg-zinc-950/20 backdrop-blur-md rounded-2xl overflow-hidden p-4 space-y-4">
        {/* Header toolbar */}
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-sm text-white tracking-wide uppercase">File Explorer</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFolderModal(true)}
              className="p-1.5 border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg transition-all"
              title="Add Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={handleCreateNote}
              className="p-1.5 border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg transition-all"
              title="Add Note"
            >
              <FilePlus2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white glass-input"
          />
        </div>

        {/* Folder explorer listing */}
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block px-1 mb-2">Folders</span>
            
            {/* Unsorted folder option */}
            <button
              onClick={() => setActiveFolderId(null)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                activeFolderId === null
                  ? 'text-white bg-primary/10 border border-primary/20 shadow-inner'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
              }`}
            >
              <Folder className="w-4 h-4 text-zinc-500 fill-zinc-500/20" />
              <span>Unsorted Notes</span>
            </button>

            {/* Folders loop */}
            {foldersData?.map((folder: any) => {
              const isSelected = activeFolderId === folder.id;
              
              return (
                <div key={folder.id} className="group flex items-center justify-between pr-1">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className={`flex-1 flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors truncate ${
                      isSelected
                        ? 'text-white bg-primary/10 border border-primary/20 shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
                    }`}
                  >
                    <Folder className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-zinc-500'}`} />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Notes listing */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block px-1 mb-2">Notes</span>
            
            {notesLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-white/5 rounded-lg border border-white/5" />
                ))}
              </div>
            ) : notesData?.length === 0 ? (
              <p className="text-xs text-zinc-600 italic px-1 py-1">No notes matching selection.</p>
            ) : (
              notesData?.map((note: any) => {
                const isSelected = selectedNoteId === note.id;
                
                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary/20 text-white'
                        : 'border-transparent hover:bg-white/[0.02] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-500'}`} />
                      <span className="text-xs font-semibold truncate flex-1">{note.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      {note.isPinned && <Pin className="w-3 h-3 text-primary fill-primary" />}
                      {note.isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. Right Note Editor Workspace */}
      <div className="flex-1 min-w-0 h-full">
        <NoteEditor noteId={selectedNoteId} />
      </div>

      {/* Add Folder Modal Overlay */}
      {showFolderModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Create Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Folder Name</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Lecture Summaries"
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setFolderName('');
                    setShowFolderModal(false);
                  }}
                  className="flex-1 h-9 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
