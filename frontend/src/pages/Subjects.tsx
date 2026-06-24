import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderOpen, Trash2, ArrowLeft, ExternalLink, Link, FileText, Calendar, AlertCircle, Paperclip, Edit3, X, Clock } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';
import { useUIStore } from '@/store/uiStore';

export const Subjects: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8B5CF6'); // default violet
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Deep-link redirect handler from search
  React.useEffect(() => {
    const redirectedSubjId = localStorage.getItem('selectedSubjectId');
    if (redirectedSubjId) {
      setSelectedSubjectId(redirectedSubjId);
      localStorage.removeItem('selectedSubjectId');
    }
  }, []);

  const { setActiveSection } = useUIStore();
  const [viewingNote, setViewingNote] = useState<any | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<any | null>(null);

  const updateAssignmentStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.put(`/assignments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectDetails', selectedSubjectId] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });

  const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#6366F1'];

  // 1. Fetch all subjects
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.subjects;
    },
  });

  // 2. Fetch scoped subject details if one is selected
  const { data: activeSubjectData } = useQuery({
    queryKey: ['subjectDetails', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return null;
      const res = await api.get(`/subjects/${selectedSubjectId}`);
      return res.data.subject;
    },
    enabled: !!selectedSubjectId,
  });

  // 3. Create subject mutation
  const createSubjectMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return api.post('/subjects', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewName('');
      setShowAddModal(false);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create subject.');
    },
  });

  // 4. Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setSelectedSubjectId(null);
    },
  });



  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-zinc-500 italic text-sm">Empty note...</p>;

    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
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

      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-extrabold text-white mt-5 mb-2 border-b border-white/5 pb-1">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-semibold text-zinc-200 mt-3 mb-1.5">{line.slice(4)}</h3>;
      }

      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-4 py-1.5 my-3 bg-white/[0.01] text-zinc-300 italic text-sm">
            {line.slice(2)}
          </blockquote>
        );
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-sm text-zinc-300">
            <li>{line.slice(2)}</li>
          </ul>
        );
      }

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

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Subject name cannot be empty.');
      return;
    }
    createSubjectMutation.mutate({ name: newName, color: newColor });
  };

  const handleDeleteSubject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this subject? All notes inside will be unlinked.')) {
      deleteSubjectMutation.mutate(id);
    }
  };

  if (selectedSubjectId && activeSubjectData) {
    const subject = activeSubjectData;
    const notes = subject.notes || [];
    const assignments = subject.assignments || [];

    return (
      <div className="space-y-8 select-none">
        {/* Scoped Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedSubjectId(null)}
            className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: subject.color }} />
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{subject.name}</h2>
            </div>
            <p className="text-sm text-zinc-400 mt-1">Workspace scoped specifically to {subject.name}.</p>
          </div>

          <button
            onClick={(e) => handleDeleteSubject(subject.id, e)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-red-500/10 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs font-semibold rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Subject</span>
          </button>
        </div>

        {/* Dashboard Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-sm text-zinc-300 uppercase tracking-wider">Notes ({notes.length})</span>
              <FileText className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <div className="p-6 border border-dashed border-white/5 rounded-xl text-center">
                  <p className="text-xs text-zinc-500">No notes for this subject.</p>
                </div>
              ) : (
                notes.map((note: any) => (
                  <GlassCard key={note.id} onClick={() => setViewingNote(note)} hoverEffect={true} className="border-white/5 !p-4 cursor-pointer">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-semibold text-zinc-200 block truncate">{note.title}</span>
                      {note.isPinned && <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-extrabold">PIN</span>}
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-2">
                      Updated {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-white/5">
                        {note.attachments.map((att: any) => {
                          const fileUrl = `http://localhost:5000${att.filePath}`;
                          return (
                            <a
                              key={att.id}
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex items-center gap-1 text-[9px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded border border-white/5 transition-all max-w-[150px] truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Paperclip className="w-2.5 h-2.5 text-zinc-500" />
                              <span className="truncate">{att.fileName}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          {/* Assignments Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-sm text-zinc-300 uppercase tracking-wider">Assignments ({assignments.length})</span>
              <Calendar className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="space-y-3">
              {assignments.length === 0 ? (
                <div className="p-6 border border-dashed border-white/5 rounded-xl text-center">
                  <p className="text-xs text-zinc-500">No active assignments due.</p>
                </div>
              ) : (
                assignments.map((ass: any) => (
                  <GlassCard key={ass.id} onClick={() => setViewingAssignment(ass)} hoverEffect={true} className="border-white/5 !p-4 cursor-pointer">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-semibold text-zinc-200 block truncate">{ass.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-zinc-500/10 text-zinc-400">
                        {ass.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-2">
                      Due {new Date(ass.deadline).toLocaleDateString()}
                    </span>
                    {ass.attachments && ass.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5 pt-2.5 border-t border-white/5">
                        {ass.attachments.map((att: any) => {
                          const fileUrl = `http://localhost:5000${att.filePath}`;
                          return (
                            <a
                              key={att.id}
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex items-center gap-1 text-[9px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded border border-white/5 transition-all max-w-[150px] truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Paperclip className="w-2.5 h-2.5 text-zinc-500" />
                              <span className="truncate">{att.fileName}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                ))
              )}
            </div>
          </div>

          {/* Resources Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-sm text-zinc-300 uppercase tracking-wider">Web Resources</span>
              <Link className="w-4 h-4 text-zinc-500" />
            </div>

            {/* Static display mock for Phase 2 resources listing */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-zinc-200 block truncate">Syllabus PDF Reference</span>
                  <span className="text-[10px] text-zinc-500 truncate block">https://university-portal.edu/docs/syllabus.pdf</span>
                </div>
                <a
                  href="https://university-portal.edu/docs/syllabus.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-zinc-200 block truncate">Weekly Lecture Playlist</span>
                  <span className="text-[10px] text-zinc-500 truncate block">https://youtube.com/playlist?list=lecture1</span>
                </div>
                <a
                  href="https://youtube.com/playlist?list=lecture1"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* Subjects Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Subject Registry</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage and access scoped resource lists for your university courses.</p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {subjectsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjectsData?.length === 0 ? (
            <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              <p className="text-zinc-500 text-sm">No subjects created yet. Click "New Subject" to begin.</p>
            </div>
          ) : (
            subjectsData?.map((subject: any) => (
              <GlassCard
                key={subject.id}
                onClick={() => setSelectedSubjectId(subject.id)}
                className="border-white/5 flex flex-col justify-between h-36 cursor-pointer"
                glowColor={`${subject.color}15`}
                style={{ borderLeft: `3px solid ${subject.color}` }}
              >
                <div>
                  <h3 className="font-bold text-lg text-white truncate">{subject.name}</h3>
                  <span className="text-xs text-zinc-500 block mt-1">Course Code Scopes</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4">
                  <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Open Workspace</span>
                  </span>
                  <button
                    onClick={(e) => handleDeleteSubject(subject.id, e)}
                    className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Add Course Subject</h3>
            
            {errorMsg && (
              <div className="p-3 mb-4 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Operating Systems"
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Theme Color</label>
                <div className="flex items-center gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        newColor === c ? 'border-white scale-110 shadow-md shadow-white/10' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

      {/* Note Viewer Modal */}
      {viewingNote && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-2xl glass-panel rounded-xl overflow-hidden flex flex-col max-h-[85vh] relative">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white leading-snug">{viewingNote.title}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Updated {new Date(viewingNote.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setViewingNote(null)}
                className="p-1.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="prose prose-invert max-w-none text-zinc-300">
                {renderMarkdown(viewingNote.content)}
              </div>

              {/* Attachments inside modal */}
              {viewingNote.attachments && viewingNote.attachments.length > 0 && (
                <div className="space-y-2 border-t border-white/5 pt-4 mt-6">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Attached Files</span>
                  <div className="flex flex-wrap gap-2">
                    {viewingNote.attachments.map((att: any) => {
                      const fileUrl = `http://localhost:5000${att.filePath}`;
                      return (
                        <a
                          key={att.id}
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{att.fileName}</span>
                          <span className="text-[10px] text-zinc-500">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer actions */}
            <div className="p-4 border-t border-white/5 bg-black/10 flex gap-3">
              <button
                type="button"
                onClick={() => setViewingNote(null)}
                className="flex-1 h-10 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('selectedNoteId', viewingNote.id);
                  setViewingNote(null);
                  setActiveSection('Notes');
                }}
                className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Open in Editor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Viewer Modal */}
      {viewingAssignment && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-md glass-panel rounded-xl overflow-hidden flex flex-col max-h-[80vh] relative">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white leading-snug">{viewingAssignment.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold" style={{ backgroundColor: `${activeSubjectData?.color || '#8B5CF6'}15`, color: activeSubjectData?.color || '#8B5CF6' }}>
                    {activeSubjectData?.name || 'Assignment'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-zinc-500/10 text-zinc-400 border border-white/5">
                    {viewingAssignment.priority}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingAssignment(null)}
                className="p-1.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Checkbox to toggle status */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.01]">
                <input
                  type="checkbox"
                  checked={viewingAssignment.status === 'COMPLETED'}
                  onChange={() => {
                    const nextStatus = viewingAssignment.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
                    updateAssignmentStatusMutation.mutate(
                      { id: viewingAssignment.id, status: nextStatus },
                      {
                        onSuccess: (res) => {
                          setViewingAssignment(res.data.assignment);
                        },
                      }
                    );
                  }}
                  className="rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-zinc-950 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-300 block">Status: {viewingAssignment.status}</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Toggle checkbox to mark as done/undone</span>
                </div>
              </div>

              {/* Deadline */}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>Due Date: <strong>{new Date(viewingAssignment.deadline).toLocaleString()}</strong></span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Description</span>
                <div className="p-3 rounded-lg border border-white/5 bg-black/10 text-xs text-zinc-300 leading-relaxed min-h-[4rem] whitespace-pre-wrap">
                  {viewingAssignment.description || <em className="text-zinc-600">No instructions or description provided.</em>}
                </div>
              </div>

              {/* Attachments */}
              {viewingAssignment.attachments && viewingAssignment.attachments.length > 0 && (
                <div className="space-y-2 border-t border-white/5 pt-4 mt-6">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Attachments</span>
                  <div className="flex flex-wrap gap-2">
                    {viewingAssignment.attachments.map((att: any) => {
                      const fileUrl = `http://localhost:5000${att.filePath}`;
                      return (
                        <a
                          key={att.id}
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/5 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Paperclip className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{att.fileName}</span>
                          <span className="text-[10px] text-zinc-500">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer actions */}
            <div className="p-4 border-t border-white/5 bg-black/10 flex gap-3">
              <button
                type="button"
                onClick={() => setViewingAssignment(null)}
                className="flex-1 h-10 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('selectedAssignmentId', viewingAssignment.id);
                  setViewingAssignment(null);
                  setActiveSection('Assignments');
                }}
                className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>Open in Tracker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
