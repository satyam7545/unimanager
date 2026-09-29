import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Plus,
  Trash2,
  Settings,
  PanelLeft,
  X,
  FileText,
  FileCheck,
  Calendar,
  BookOpen,
  Lightbulb,
  Sparkles,
  ClipboardList,
  ArrowUpRight,
} from 'lucide-react';
import { api, BASE_URL } from '@/services/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { GlassCard } from '@/components/GlassCard';
import { AISettingsModal } from '@/features/ai/components/AISettingsModal';
import { RAGInspectorModal } from '@/features/ai/components/RAGInspectorModal';
import { ChatWindow } from '@/features/ai/components/ChatWindow';
import { StudyToolRunner } from '@/features/ai/components/StudyToolRunner';

export const AIAssistant: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Chat States
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [includeRag, setIncludeRag] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeRAGContext, setActiveRAGContext] = useState<string | null>(null);
  const [showRAGInspector, setShowRAGInspector] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);

  // AI Tools Form States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [plannerHours, setPlannerHours] = useState<number>(4);
  const [selectedWeakSubjects, setSelectedWeakSubjects] = useState<string[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [customTextContent, setCustomTextContent] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [quizQuestionCount, setQuizQuestionCount] = useState<number>(5);

  // AI Tools Results States
  const [toolLoading, setToolLoading] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [pdfSummaryResult, setPdfSummaryResult] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<string>('');
  const [plannerResult, setPlannerResult] = useState<any[]>([]);
  const [assignmentTasks, setAssignmentTasks] = useState<any[]>([]);
  const [revisionNotesResult, setRevisionNotesResult] = useState<string>('');
  const [flashcardsResult, setFlashcardsResult] = useState<any[]>([]);
  const [quizResult, setQuizResult] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);

  // Interactive UI Helper States
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [showQuizExplanation, setShowQuizExplanation] = useState<Record<number, boolean>>({});
  const [importState, setImportState] = useState<Record<string, 'idle' | 'loading' | 'success'>>({
    note: 'idle',
    tasks: 'idle',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Core AI Config Queries
  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['aiSettings'],
    queryFn: async () => {
      const res = await api.get('/ai/settings');
      return res.data.settings;
    },
  });

  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } = useQuery({
    queryKey: ['aiConversations'],
    queryFn: async () => {
      const res = await api.get('/ai/conversations');
      return res.data.conversations;
    },
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['aiMessages', activeConvId],
    queryFn: async () => {
      if (!activeConvId) return [];
      const res = await api.get(`/ai/conversations/${activeConvId}/messages`);
      return res.data.messages;
    },
    enabled: !!activeConvId && activeTab === 'chat',
  });

  // Fetch contextual user workspace lists for Tools forms
  const { data: subjectsList } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.subjects;
    },
    enabled: activeTab === 'tools',
  });

  const { data: assignmentsList } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments');
      return res.data.assignments;
    },
    enabled: activeTab === 'tools',
  });

  const { data: projectsList } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data.projects;
    },
    enabled: activeTab === 'tools',
  });

  const { data: notesList } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const res = await api.get('/notes');
      return res.data.notes;
    },
    enabled: activeTab === 'tools',
  });

  // Handle Note editor "Ask AI" deep link redirects
  useEffect(() => {
    const deepNoteId = localStorage.getItem('selectedNoteIdForAI');
    if (deepNoteId) {
      localStorage.removeItem('selectedNoteIdForAI');
      setActiveTab('tools');
      setActiveTool('revision-notes');
      setSelectedNoteId(deepNoteId);
      setMobileSidebarOpen(false);
    }
  }, [notesList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages, streamingMessage]);

  // Mutations
  const createConvMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ai/conversations');
      return res.data.conversation;
    },
    onSuccess: (newConv) => {
      refetchConvs();
      setActiveConvId(newConv.id);
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/ai/conversations/${id}`),
    onSuccess: (_, deletedId) => {
      refetchConvs();
      if (activeConvId === deletedId) {
        setActiveConvId(null);
      }
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (updated: any) => api.post('/ai/settings', updated),
    onSuccess: () => {
      refetchSettings();
      setShowSettings(false);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId || isSending) return;

    const textToSend = messageText;
    setMessageText('');
    setIsSending(true);
    setStreamingMessage('');
    setActiveRAGContext(null);

    // 1. Cancel active messages query to prevent race conditions
    await queryClient.cancelQueries({ queryKey: ['aiMessages', activeConvId] });

    // 2. Add USER message optimistically to the queryClient
    const previousMessages = queryClient.getQueryData(['aiMessages', activeConvId]);
    queryClient.setQueryData(['aiMessages', activeConvId], (old: any) => [
      ...(old || []),
      {
        id: 'optimistic-user-' + Date.now(),
        role: 'USER',
        content: textToSend,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      // 3. Retrieve auth token to authorize the SSE connection
      const { accessToken } = useAuthStore.getState();

      // 4. Construct URL and send request
      const response = await fetch(`${BASE_URL}/ai/conversations/${activeConvId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: textToSend, includeRag }),
      });

      if (!response.ok) {
        let errText = '';
        try {
          const errData = await response.json();
          errText = errData.message;
        } catch {
          errText = response.statusText;
        }
        throw new Error(errText || 'Failed to connect to AI streaming endpoint.');
      }

      if (!response.body) {
        throw new Error('Response body is empty.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value || new Uint8Array(), { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                setStreamingMessage((prev) => (prev || '') + parsed.chunk);
              } else if (parsed.context) {
                setActiveRAGContext(parsed.context);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore line parse errors if incomplete
            }
          }
        }
      }

      // 5. Success - invalidate queries to fetch clean DB state
      queryClient.invalidateQueries({ queryKey: ['aiMessages', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
    } catch (err: any) {
      console.error(err);
      queryClient.setQueryData(['aiMessages', activeConvId], previousMessages);
      alert(`AI completion failed: ${err.message || 'Unknown streaming error.'}\n\nPlease check your AI Settings and ensure your local LLM server is running.`);
    } finally {
      setIsSending(false);
      setStreamingMessage(null);
    }
  };

  // --- AI Study Tools Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleToggleWeakSubject = (subjName: string) => {
    setSelectedWeakSubjects((prev) =>
      prev.includes(subjName) ? prev.filter((s) => s !== subjName) : [...prev, subjName]
    );
  };

  const executeStudyTool = async (e: React.FormEvent) => {
    e.preventDefault();
    setToolLoading(true);
    setToolError(null);

    setFlashcardIndex(0);
    setFlashcardFlipped(false);
    setQuizAnswers({});
    setShowQuizExplanation({});

    try {
      if (activeTool === 'summarize-pdf') {
        if (!selectedFile) throw new Error('Please upload a PDF document first.');
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await api.post('/ai/features/summarize-pdf', formData);
        setPdfSummaryResult(res.data.summary);
      } else if (activeTool === 'ocr-image') {
        if (!selectedFile) throw new Error('Please upload an image document first.');
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await api.post('/ai/features/ocr-image', formData);
        setOcrResult(res.data.text);
      } else if (activeTool === 'study-planner') {
        const res = await api.post('/ai/features/study-planner', {
          availableHours: plannerHours,
          weakSubjects: selectedWeakSubjects,
        });
        const parsed = JSON.parse(res.data.plan);
        setPlannerResult(Array.isArray(parsed) ? parsed : []);
      } else if (activeTool === 'assignment-assistant') {
        if (!selectedAssignmentId) throw new Error('Please select an assignment to break down.');
        const res = await api.post('/ai/features/assignment-assistant', {
          assignmentId: selectedAssignmentId,
        });
        const parsed = JSON.parse(res.data.tasks);
        setAssignmentTasks(Array.isArray(parsed) ? parsed : []);
      } else if (activeTool === 'revision-notes') {
        const res = await api.post('/ai/features/revision-notes', {
          content: customTextContent,
          noteId: selectedNoteId || undefined,
        });
        setRevisionNotesResult(res.data.notes);
      } else if (activeTool === 'flashcards') {
        const res = await api.post('/ai/features/flashcards', {
          content: customTextContent,
          noteId: selectedNoteId || undefined,
          topic: customTopic || undefined,
        });
        const parsed = JSON.parse(res.data.flashcards);
        setFlashcardsResult(Array.isArray(parsed) ? parsed : []);
      } else if (activeTool === 'quiz') {
        const res = await api.post('/ai/features/quiz', {
          content: customTextContent,
          noteId: selectedNoteId || undefined,
          topic: customTopic || undefined,
          questionCount: quizQuestionCount,
        });
        const parsed = JSON.parse(res.data.quiz);
        setQuizResult(Array.isArray(parsed) ? parsed : []);
      } else if (activeTool === 'project-assistant') {
        if (!selectedProjectId) throw new Error('Please select a project board to suggest milestones.');
        const res = await api.post('/ai/features/project-assistant', {
          projectId: selectedProjectId,
        });
        const parsed = JSON.parse(res.data.tasks);
        setProjectTasks(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err: any) {
      console.error(err);
      setToolError(err.response?.data?.message || err.message || 'Execution error occurred during AI processing.');
    } finally {
      setToolLoading(false);
    }
  };

  const handleSaveTextAsNote = async (title: string, content: string) => {
    setImportState((prev) => ({ ...prev, note: 'loading' }));
    try {
      await api.post('/notes', {
        title,
        content,
        isRichText: false,
      });
      setImportState((prev) => ({ ...prev, note: 'success' }));
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setTimeout(() => setImportState((prev) => ({ ...prev, note: 'idle' })), 2000);
    } catch {
      alert('Failed to save summary as a note.');
      setImportState((prev) => ({ ...prev, note: 'idle' }));
    }
  };

  const handleImportTasksToBoard = async (type: 'project' | 'assignment', targetId: string, list: any[]) => {
    setImportState((prev) => ({ ...prev, tasks: 'loading' }));
    try {
      for (const t of list) {
        const payload: any = {
          title: t.title,
          priority: t.priority || 'MEDIUM',
          status: 'TODO',
        };
        if (type === 'project') {
          payload.projectId = targetId;
          payload.columnId = 'ideas';
        } else {
          payload.assignmentId = targetId;
        }
        await api.post('/tasks', payload);
      }
      setImportState((prev) => ({ ...prev, tasks: 'success' }));
      if (type === 'project') {
        queryClient.invalidateQueries({ queryKey: ['projectDetails', targetId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setTimeout(() => setImportState((prev) => ({ ...prev, tasks: 'idle' })), 2000);
    } catch {
      alert('Failed to sync tasks to the database board.');
      setImportState((prev) => ({ ...prev, tasks: 'idle' }));
    }
  };

  const toolsList = [
    { id: 'summarize-pdf', name: 'PDF Summarizer', icon: FileText, desc: 'Summarize uploaded PDFs into high-yield markdown revision outlines.' },
    { id: 'ocr-image', name: 'Image OCR Reader', icon: FileCheck, desc: 'Extract handwritten or printed text from images and whiteboard screenshots.' },
    { id: 'study-planner', name: 'Smart Study Planner', icon: Calendar, desc: 'Generate daily schedules mapped around available hours, exams, and weak subjects.' },
    { id: 'revision-notes', name: 'Revision notes Generator', icon: BookOpen, desc: 'Condense note texts or lecture drafts into concise study files.' },
    { id: 'flashcards', name: 'Flashcard deck Generator', icon: Lightbulb, desc: 'Generate interactive front/back flipping decks from notes or subjects.' },
    { id: 'quiz', name: 'Quiz MCQ Generator', icon: Sparkles, desc: 'Generate multiple-choice practice questions with option checks and explanations.' },
    { id: 'assignment-assistant', name: 'Assignment Assistant', icon: ClipboardList, desc: 'Break down complex assignments into checklist subtasks mapped to deadlines.' },
    { id: 'project-assistant', name: 'Project Assistant', icon: ArrowUpRight, desc: 'Suggest Kanban columns and tasks specific to your coding and personal projects.' },
  ];

  return (
    <div className="h-[calc(100vh-10rem)] flex gap-0 md:gap-6 select-none overflow-hidden relative">
      {/* 1. Sidebar Panel */}
      <aside className={`${
        mobileSidebarOpen ? 'flex fixed inset-y-0 left-0 z-50 pt-4 pb-4 pl-4' : 'hidden md:flex'
      } w-72 md:w-64 border border-white/5 bg-black/30 backdrop-blur-xl rounded-2xl flex-col overflow-hidden shrink-0 transition-all`}>
        
        {/* Navigation Tabs Header */}
        <div className="grid grid-cols-2 border-b border-white/5 bg-black/20 p-1 shrink-0 text-center text-xs font-bold font-sans">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'chat' ? 'bg-primary/20 text-white shadow-inner border border-primary/20' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Chat Threads
          </button>
          <button
            onClick={() => {
              setActiveTab('tools');
              setActiveTool(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'tools' ? 'bg-primary/20 text-white shadow-inner border border-primary/20' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Study Tools
          </button>
        </div>

        {/* Mobile close sidebar button */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="md:hidden absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dynamic Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {activeTab === 'chat' ? (
            <>
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/5">
                <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Active Conversations</span>
                <button
                  onClick={() => createConvMutation.mutate()}
                  className="p-1 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all active:scale-95 flex items-center justify-center"
                  title="New Thread"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingConvs ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-10 bg-white/5 rounded-lg" />
                  <div className="h-10 bg-white/5 rounded-lg" />
                </div>
              ) : conversations?.length === 0 ? (
                <div className="py-8 text-center text-[10px] text-zinc-600">
                  No active threads. Click '+' to start.
                </div>
              ) : (
                conversations?.map((c: any) => {
                  const isActive = activeConvId === c.id;
                  const isEditing = editingConvId === c.id;
                  const displayTitle = localStorage.getItem(`conv_title_${c.id}`) || (
                    c.lastMessage && c.lastMessage !== 'No messages yet.'
                      ? c.lastMessage
                      : `${c.provider.toUpperCase()} Session`
                  );

                  return (
                    <div
                      key={c.id}
                      onClick={() => !isEditing && setActiveConvId(c.id)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 group cursor-pointer transition-all ${
                        isActive
                          ? 'border-primary/30 bg-primary/5 text-white'
                          : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              onBlur={() => {
                                if (editingTitleText.trim()) {
                                  localStorage.setItem(`conv_title_${c.id}`, editingTitleText.trim());
                                } else {
                                  localStorage.removeItem(`conv_title_${c.id}`);
                                }
                                setEditingConvId(null);
                                refetchConvs();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (editingTitleText.trim()) {
                                    localStorage.setItem(`conv_title_${c.id}`, editingTitleText.trim());
                                  } else {
                                    localStorage.removeItem(`conv_title_${c.id}`);
                                  }
                                  setEditingConvId(null);
                                  refetchConvs();
                                } else if (e.key === 'Escape') {
                                  setEditingConvId(null);
                                }
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              className="w-full bg-zinc-900 border border-primary/45 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <div
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingConvId(c.id);
                                setEditingTitleText(displayTitle);
                              }}
                              className="text-xs font-bold truncate select-none"
                              title="Double click to rename"
                            >
                              {displayTitle}
                            </div>
                          )}
                          <div className="text-[9px] text-zinc-500 font-semibold tracking-wide uppercase mt-0.5 select-none">
                            {c.model}
                          </div>
                        </div>
                      </div>
                      {confirmDeleteConvId === c.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteConvMutation.mutate(c.id); setConfirmDeleteConvId(null); }}
                            className="px-1.5 py-0.5 text-[9px] rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteConvId(null); }}
                            className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 border border-white/10 text-zinc-400 hover:text-white font-bold transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteConvId(c.id); }}
                          className="p-1 rounded text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <>
              <div className="pb-2 mb-1 border-b border-white/5">
                <span className="text-[10px] font-extrabold uppercase text-zinc-500 tracking-wider">Decomposition Tools</span>
              </div>
              {toolsList.map((tool) => {
                const ToolIcon = tool.icon;
                const isSelected = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setToolError(null);
                    }}
                    className={`w-full p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all truncate font-semibold text-xs ${
                      isSelected
                        ? 'border-primary/30 bg-primary/5 text-white'
                        : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <ToolIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-500'}`} />
                    <span className="truncate">{tool.name}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* AI Configuration Settings footer */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full h-9 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-zinc-400 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>AI Settings</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 2. Main Workspace Panel */}
      <main className="flex-1 border border-white/5 bg-black/10 rounded-2xl flex flex-col overflow-hidden relative">
        {/* Mobile sidebar toggle button */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-xl border border-white/10 bg-black/30 backdrop-blur-md text-zinc-400 hover:text-white transition-colors"
          aria-label="Open sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {/* CHAT VIEW CONTAINER */}
        {activeTab === 'chat' && (
          <ChatWindow
            activeConvId={activeConvId}
            provider={settings?.provider || 'openai'}
            model={settings?.model || 'gpt-4o-mini'}
            includeRag={includeRag}
            setIncludeRag={setIncludeRag}
            activeRAGContext={activeRAGContext}
            onInspectRAG={() => setShowRAGInspector(true)}
            loadingMessages={loadingMessages}
            messages={messages || []}
            isSending={isSending}
            streamingMessage={streamingMessage}
            messageText={messageText}
            setMessageText={setMessageText}
            onSendMessage={handleSendMessage}
            messagesEndRef={messagesEndRef}
            onCreateConversation={() => createConvMutation.mutate()}
          />
        )}

        {/* TOOLS HOME SELECTION GRID */}
        {activeTab === 'tools' && activeTool === null && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-white">Academic Study Tools</h3>
              <p className="text-xs text-zinc-400 mt-1">Leverage LLM utility assistants to summarize texts, plan schedules, and generate testing quizzes.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {toolsList.map((tool) => {
                const ToolIcon = tool.icon;
                return (
                  <GlassCard
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id);
                      setToolError(null);
                    }}
                    className="border-white/5 flex flex-col justify-between h-44 cursor-pointer relative group"
                    glowColor="rgba(139, 92, 246, 0.05)"
                  >
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <ToolIcon className="w-5.5 h-5.5" />
                      </div>
                      <h4 className="font-bold text-sm text-white group-hover:text-primary transition-all mt-2">{tool.name}</h4>
                      <p className="text-xs text-zinc-500 leading-normal line-clamp-2">{tool.desc}</p>
                    </div>

                    <span className="text-[10px] text-primary font-bold uppercase tracking-wider block border-t border-white/5 pt-2.5 mt-4">
                      Launch Assistant &rarr;
                    </span>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTIVE TOOL RUNNER WORKSPACE */}
        {activeTab === 'tools' && activeTool !== null && (
          <StudyToolRunner
            activeTool={activeTool}
            toolsList={toolsList}
            setActiveTool={setActiveTool}
            executeStudyTool={executeStudyTool}
            toolLoading={toolLoading}
            toolError={toolError}
            selectedFile={selectedFile}
            handleFileChange={handleFileChange}
            plannerHours={plannerHours}
            setPlannerHours={setPlannerHours}
            selectedWeakSubjects={selectedWeakSubjects}
            handleToggleWeakSubject={handleToggleWeakSubject}
            selectedAssignmentId={selectedAssignmentId}
            setSelectedAssignmentId={setSelectedAssignmentId}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            selectedNoteId={selectedNoteId}
            setSelectedNoteId={setSelectedNoteId}
            customTopic={customTopic}
            setCustomTopic={setCustomTopic}
            customTextContent={customTextContent}
            setCustomTextContent={setCustomTextContent}
            quizQuestionCount={quizQuestionCount}
            setQuizQuestionCount={setQuizQuestionCount}
            subjectsList={subjectsList}
            assignmentsList={assignmentsList}
            projectsList={projectsList}
            notesList={notesList}
            pdfSummaryResult={pdfSummaryResult}
            ocrResult={ocrResult}
            plannerResult={plannerResult}
            assignmentTasks={assignmentTasks}
            projectTasks={projectTasks}
            revisionNotesResult={revisionNotesResult}
            flashcardsResult={flashcardsResult}
            quizResult={quizResult}
            flashcardIndex={flashcardIndex}
            setFlashcardIndex={setFlashcardIndex}
            flashcardFlipped={flashcardFlipped}
            setFlashcardFlipped={setFlashcardFlipped}
            quizAnswers={quizAnswers}
            setQuizAnswers={setQuizAnswers}
            showQuizExplanation={showQuizExplanation}
            setShowQuizExplanation={setShowQuizExplanation}
            importState={importState}
            handleSaveTextAsNote={handleSaveTextAsNote}
            handleImportTasksToEntity={handleImportTasksToBoard}
          />
        )}
      </main>

      {/* AI Settings Overlay dialog */}
      <AISettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={(cfg) => saveSettingsMutation.mutate(cfg)}
        isSaving={saveSettingsMutation.isPending}
      />

      {/* RAG Context Inspector Modal */}
      <RAGInspectorModal
        isOpen={showRAGInspector}
        onClose={() => setShowRAGInspector(false)}
        context={activeRAGContext}
      />
    </div>
  );
};
