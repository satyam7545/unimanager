import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  FileText,
  CheckSquare,
  Calendar,
  Loader2,
  AlertCircle,
  Tag,
  Check,
  Send
} from 'lucide-react';
import { api } from '@/services/api';
import { useUIStore } from '@/store/uiStore';

type CaptureTab = 'note' | 'task' | 'assignment';

export const QuickCaptureModal: React.FC = () => {
  const { quickCaptureOpen, setQuickCaptureOpen } = useUIStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CaptureTab>('note');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common Subject Selection
  const [subjectId, setSubjectId] = useState<string>('');

  // Note fields
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');

  // Task fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskSlot, setTaskSlot] = useState<'MORNING' | 'AFTERNOON' | 'NIGHT'>('AFTERNOON');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [taskDate, setTaskDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Assignment fields
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [assignmentPriority, setAssignmentPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [assignmentDescription, setAssignmentDescription] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus active title input when modal opens or tab changes
  useEffect(() => {
    if (quickCaptureOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [quickCaptureOpen, activeTab]);

  // Fetch subjects for dropdown
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data?.subjects || [];
    },
    enabled: quickCaptureOpen,
  });

  // Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const tagsList = noteTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      return api.post('/notes', {
        title: noteTitle.trim(),
        content: noteContent,
        subjectId: subjectId || null,
        tags: tagsList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['globalSearch'] });
      showSuccessAndClose('Note created successfully!');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create note');
    },
  });

  // Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const parsedDate = new Date(taskDate);
      parsedDate.setHours(12, 0, 0, 0);
      return api.post('/tasks', {
        title: taskTitle.trim(),
        timeSlot: taskSlot,
        priority: taskPriority,
        date: parsedDate.toISOString(),
        subjectId: subjectId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['globalSearch'] });
      showSuccessAndClose('Task added to Planner!');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create task');
    },
  });

  // Assignment Mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      return api.post('/assignments', {
        title: assignmentTitle.trim(),
        description: assignmentDescription,
        deadline: new Date(assignmentDeadline).toISOString(),
        priority: assignmentPriority,
        subjectId: subjectId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['globalSearch'] });
      showSuccessAndClose('Assignment created!');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create assignment');
    },
  });

  const isSubmitting =
    createNoteMutation.isPending ||
    createTaskMutation.isPending ||
    createAssignmentMutation.isPending;

  const showSuccessAndClose = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      // Reset forms
      setNoteTitle('');
      setNoteContent('');
      setNoteTags('');
      setTaskTitle('');
      setAssignmentTitle('');
      setAssignmentDescription('');
      setSuccessMessage(null);
      setQuickCaptureOpen(false);
    }, 600);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'note') {
      if (!noteTitle.trim()) {
        setErrorMessage('Note title is required');
        return;
      }
      createNoteMutation.mutate();
    } else if (activeTab === 'task') {
      if (!taskTitle.trim()) {
        setErrorMessage('Task title is required');
        return;
      }
      createTaskMutation.mutate();
    } else if (activeTab === 'assignment') {
      if (!assignmentTitle.trim()) {
        setErrorMessage('Assignment title is required');
        return;
      }
      createAssignmentMutation.mutate();
    }
  };

  // Keyboard navigation within modal: Alt+1/2/3 to switch tabs, Ctrl+Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      setActiveTab('note');
    }
    if (e.altKey && e.key === '2') {
      e.preventDefault();
      setActiveTab('task');
    }
    if (e.altKey && e.key === '3') {
      e.preventDefault();
      setActiveTab('assignment');
    }
  };

  if (!quickCaptureOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={() => setQuickCaptureOpen(false)}
        onKeyDown={handleKeyDown}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xl bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header & Tabs */}
          <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('note')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'note'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Note</span>
                <span className="text-[10px] opacity-60 ml-0.5">Alt+1</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('task')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'task'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Task</span>
                <span className="text-[10px] opacity-60 ml-0.5">Alt+2</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assignment')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'assignment'
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Assignment</span>
                <span className="text-[10px] opacity-60 ml-0.5">Alt+3</span>
              </button>
            </div>

            <button
              onClick={() => setQuickCaptureOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Feedback Notifications */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Note Tab Content */}
            {activeTab === 'note' && (
              <div className="space-y-3">
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note Title..."
                    className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div>
                  <textarea
                    rows={4}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write your note markdown or thoughts here..."
                    className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Subject (Optional)</label>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full h-9 px-2.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-primary"
                    >
                      <option value="">No Subject</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Tags (Comma-separated)</label>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2.5 h-9">
                      <Tag className="w-3.5 h-3.5 text-zinc-500 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={noteTags}
                        onChange={(e) => setNoteTags(e.target.value)}
                        placeholder="lecture, exam, revision"
                        className="w-full bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Tab Content */}
            {activeTab === 'task' && (
              <div className="space-y-3">
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task Title (e.g., Read chapter 4, review code)..."
                    className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Slot</label>
                    <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                      {(['MORNING', 'AFTERNOON', 'NIGHT'] as const).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTaskSlot(slot)}
                          className={`flex-1 py-1 rounded text-[11px] font-semibold transition-all ${
                            taskSlot === slot
                              ? 'bg-primary text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {slot === 'MORNING' ? '🌅 AM' : slot === 'AFTERNOON' ? '☀️ PM' : '🌙 Night'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={taskDate}
                      onChange={(e) => setTaskDate(e.target.value)}
                      className="w-full h-9 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as any)}
                      className="w-full h-9 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent ⚡</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Subject (Optional)</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full h-9 px-2.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-primary"
                  >
                    <option value="">No Subject</option>
                    {subjects.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Assignment Tab Content */}
            {activeTab === 'assignment' && (
              <div className="space-y-3">
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="Assignment Title (e.g., Physics Lab Report)..."
                    className="w-full h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Deadline</label>
                    <input
                      type="datetime-local"
                      value={assignmentDeadline}
                      onChange={(e) => setAssignmentDeadline(e.target.value)}
                      className="w-full h-9 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Priority</label>
                    <select
                      value={assignmentPriority}
                      onChange={(e) => setAssignmentPriority(e.target.value as any)}
                      className="w-full h-9 px-2 bg-zinc-900 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent ⚡</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Subject</label>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full h-9 px-2.5 bg-zinc-900 border border-white/10 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-primary"
                    >
                      <option value="">Select Course...</option>
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={assignmentDescription}
                    onChange={(e) => setAssignmentDescription(e.target.value)}
                    placeholder="Instructions, guidelines, rubric notes..."
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-white/5">
              <div className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-1">
                <span>Save with</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-zinc-400 font-mono">
                  Ctrl+Enter
                </kbd>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setQuickCaptureOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Save {activeTab === 'note' ? 'Note' : activeTab === 'task' ? 'Task' : 'Assignment'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
