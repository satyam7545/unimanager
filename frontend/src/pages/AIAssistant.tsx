import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Trash2,
  Settings,
  MessageSquare,
  Plus,
  Check,
  Brain,
  Loader2,
  X,
  Copy,
  Sliders,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardList,
  Calendar,
  Lightbulb,
  FileText,
  CheckCircle2,
  Circle,
  FileCheck,
  ArrowUpRight,
  PanelLeft
} from 'lucide-react';
import { api, BASE_URL } from '@/services/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { GlassCard } from '@/components/GlassCard';

// Custom Markdown Renderer
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
      {blocks.map((block, idx) => {
        if (block.startsWith('```')) {
          const lines = block.split('\n');
          const firstLine = lines[0];
          const lang = firstLine.replace('```', '').trim() || 'code';
          const code = lines.slice(1, -1).join('\n');
          
          return (
            <div key={idx} className="rounded-lg border border-white/5 bg-zinc-950 overflow-hidden my-3 select-text">
              <div className="flex items-center justify-between px-4 py-1.5 bg-white/[0.02] border-b border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                <span>{lang}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-xs text-zinc-400 font-mono">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split('\n');
        return (
          <p key={idx} className="whitespace-pre-wrap select-text leading-relaxed">
            {lines.map((line, lIdx) => {
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                const content = line.trim().substring(2);
                return (
                  <span key={lIdx} className="block pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-primary mt-1">
                    {parseInlineMarkdown(content)}
                  </span>
                );
              }
              const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
              if (numMatch) {
                const num = numMatch[1];
                const content = numMatch[2];
                return (
                  <span key={lIdx} className="block pl-5 relative before:content-[attr(data-num)] before:absolute before:left-0 before:text-primary before:font-bold mt-1" data-num={`${num}.`}>
                    {parseInlineMarkdown(content)}
                  </span>
                );
              }
              return (
                <React.Fragment key={lIdx}>
                  {parseInlineMarkdown(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </p>
        );
      })}
    </div>
  );
};

function parseInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-primary">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export const AIAssistant: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Chat States
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);

  // Mobile: show sidebar OR main panel (not both at once)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [includeRag, setIncludeRag] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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
  const [isSending, setIsSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  
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

  // Settings State fields
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');

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

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider);
      setApiKey(settings.apiKey || '');
      setEndpoint(settings.endpoint || '');
      setModel(settings.model || '');
      setTemperature(settings.temperature ?? 0.7);
      setMaxTokens(settings.maxTokens ?? 2048);
      setSystemPrompt(settings.systemPrompt || '');
    }
  }, [settings]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    if (newProvider === 'openai') {
      setEndpoint('');
      setModel('gpt-4o-mini');
    } else if (newProvider === 'gemini') {
      setEndpoint('');
      setModel('gemini-1.5-flash');
    } else if (newProvider === 'claude') {
      setEndpoint('');
      setModel('claude-3-5-sonnet-20240620');
    } else if (newProvider === 'deepseek') {
      setEndpoint('');
      setModel('deepseek-chat');
    } else if (newProvider === 'ollama') {
      setEndpoint('http://127.0.0.1:11434/v1/chat/completions');
      setModel('llama3');
    } else if (newProvider === 'lmstudio') {
      setEndpoint('http://127.0.0.1:1234/v1/chat/completions');
      setModel('local-model');
    }
  };

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
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                setStreamingMessage((prev) => (prev || '') + parsed.chunk);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (err) {
              // Ignore line parse errors if it's incomplete/malformed
            }
          }
        }
      }

      // 5. Success - invalidate query to fetch clean DB state and trigger sidebar update
      queryClient.invalidateQueries({ queryKey: ['aiMessages', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['aiConversations'] });
    } catch (err: any) {
      console.error(err);
      // Revert optimistic update
      queryClient.setQueryData(['aiMessages', activeConvId], previousMessages);
      alert(`AI completion failed: ${err.message || 'Unknown streaming error.'}\n\nPlease check your AI Settings and ensure your local LLM server is running.`);
    } finally {
      setIsSending(false);
      setStreamingMessage(null);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate({
      provider,
      apiKey: apiKey.trim(),
      endpoint: endpoint.trim(),
      model: model.trim(),
      temperature,
      maxTokens,
      systemPrompt: systemPrompt.trim(),
    });
  };

  // --- AI Study Tools Form Handlers ---

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
    
    // Reset specific tool visual helper states
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
      } 
      
      else if (activeTool === 'ocr-image') {
        if (!selectedFile) throw new Error('Please upload an image document first.');
        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await api.post('/ai/features/ocr-image', formData);
        setOcrResult(res.data.text);
      } 
      
      else if (activeTool === 'study-planner') {
        const res = await api.post('/ai/features/study-planner', {
          availableHours: plannerHours,
          weakSubjects: selectedWeakSubjects,
        });
        const parsed = JSON.parse(res.data.plan);
        setPlannerResult(Array.isArray(parsed) ? parsed : []);
      } 
      
      else if (activeTool === 'assignment-assistant') {
        if (!selectedAssignmentId) throw new Error('Please select an assignment to break down.');
        const res = await api.post('/ai/features/assignment-assistant', {
          assignmentId: selectedAssignmentId,
        });
        const parsed = JSON.parse(res.data.tasks);
        setAssignmentTasks(Array.isArray(parsed) ? parsed : []);
      } 
      
      else if (activeTool === 'revision-notes') {
        const res = await api.post('/ai/features/revision-notes', {
          content: customTextContent,
          noteId: selectedNoteId || undefined,
        });
        setRevisionNotesResult(res.data.notes);
      } 
      
      else if (activeTool === 'flashcards') {
        const res = await api.post('/ai/features/flashcards', {
          content: customTextContent,
          noteId: selectedNoteId || undefined,
          topic: customTopic || undefined,
        });
        const parsed = JSON.parse(res.data.flashcards);
        setFlashcardsResult(Array.isArray(parsed) ? parsed : []);
      } 
      
      else if (activeTool === 'quiz') {
        const res = await api.post('/ai/features/quiz', {
          content: customTextContent,
          noteId: selectedNoteId || undefined,
          topic: customTopic || undefined,
          questionCount: quizQuestionCount,
        });
        const parsed = JSON.parse(res.data.quiz);
        setQuizResult(Array.isArray(parsed) ? parsed : []);
      } 
      
      else if (activeTool === 'project-assistant') {
        if (!selectedProjectId) throw new Error('Please select a project board to suggest milestones.');
        const res = await api.post('/ai/features/project-assistant', {
          projectId: selectedProjectId,
        });
        const parsed = JSON.parse(res.data.tasks);
        setProjectTasks(Array.isArray(parsed) ? parsed : []);
      }
    } catch (err: any) {
      console.error(err);
      setToolError(err.response?.data?.message || err.message || 'Execution error occured during AI processing.');
    } finally {
      setToolLoading(false);
    }
  };

  // --- DB Exporter Sync Helpers ---

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
    } catch (err) {
      alert('Failed to save summary as a note.');
      setImportState((prev) => ({ ...prev, note: 'idle' }));
    }
  };

  const handleImportTasksToPlanner = async () => {
    setImportState((prev) => ({ ...prev, tasks: 'loading' }));
    try {
      const todayStr = new Date().toISOString();
      for (const block of plannerResult) {
        await api.post('/tasks', {
          title: `Focus: ${block.activity} (${block.time})`,
          timeSlot: block.time.toLowerCase().includes('morning') || block.time.startsWith('09') || block.time.startsWith('10') ? 'MORNING' : block.time.toLowerCase().includes('night') ? 'NIGHT' : 'AFTERNOON',
          date: todayStr,
          priority: block.priority || 'MEDIUM',
          status: 'TODO',
        });
      }
      setImportState((prev) => ({ ...prev, tasks: 'success' }));
      queryClient.invalidateQueries({ queryKey: ['plannerTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setTimeout(() => setImportState((prev) => ({ ...prev, tasks: 'idle' })), 2000);
    } catch (err) {
      alert('Failed to import study tasks into Planner.');
      setImportState((prev) => ({ ...prev, tasks: 'idle' }));
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
          payload.columnId = 'ideas'; // Default ideas column
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
    } catch (err) {
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
      
      {/* 1. Sidebar Panel — hidden on mobile unless mobileSidebarOpen */}
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
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2 group cursor-pointer transition-all ${
                        isActive
                          ? 'border-primary/30 bg-primary/5 text-white'
                          : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {c.lastMessage && c.lastMessage !== 'No messages yet.'
                              ? c.lastMessage
                              : `${c.provider.toUpperCase()} Session`}
                          </div>
                          <div className="text-[9px] text-zinc-500 font-semibold tracking-wide uppercase mt-0.5">
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
                          <Trash2 className="w-3 h-3" />
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

        {/* Mobile sidebar toggle button — top-left of main panel */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden absolute top-3 left-3 z-10 p-2 rounded-xl border border-white/10 bg-black/30 backdrop-blur-md text-zinc-400 hover:text-white transition-colors"
          aria-label="Open sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        
        {/* --- CHAT VIEW CONTAINER --- */}
        {activeTab === 'chat' && (
          activeConvId ? (
            <>
              <header className="h-14 border-b border-white/5 pl-12 md:pl-6 pr-4 md:pr-6 flex items-center justify-between shrink-0 bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow shadow-emerald-500 animate-pulse" />
                  <div>
                    <span className="text-xs font-extrabold text-white tracking-tight">Active Assistant</span>
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider ml-3 border-l border-white/10 pl-3">
                      {provider.toUpperCase()} ({model})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIncludeRag(!includeRag)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                    includeRag ? 'border-primary/20 bg-primary/10 text-primary' : 'border-white/5 bg-white/[0.01] text-zinc-500'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 shrink-0" />
                  <span>RAG Context</span>
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Workspace Chat Assistant</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Ask questions about notes, events, assignments, or subjects. The engine will retrieve items from database context.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages?.map((m: any) => {
                      const isAI = m.role === 'ASSISTANT';
                      return (
                        <div key={m.id} className={`flex gap-3.5 ${isAI ? 'justify-start' : 'justify-end'}`}>
                          {isAI && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0 select-none">
                              <Bot className="w-4 h-4" />
                            </div>
                          )}
                          <div className={`p-3 md:p-4 rounded-2xl max-w-[85vw] md:max-w-xl ${isAI ? 'glass-panel border-white/5 rounded-tl-none text-zinc-300' : 'bg-primary text-white rounded-tr-none font-medium'}`}>
                            {isAI ? <MarkdownText text={m.content} /> : <p className="text-sm whitespace-pre-wrap select-text leading-relaxed">{m.content}</p>}
                          </div>
                          {!isAI && (
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-xs shrink-0 select-none">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {isSending && !streamingMessage && (
                      <div className="flex gap-3.5 justify-start select-none">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0">
                          <Bot className="w-4 h-4 animate-pulse" />
                        </div>
                        <div className="glass-panel border-white/5 px-5 py-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                        </div>
                      </div>
                    )}
                    {streamingMessage && (
                      <div className="flex gap-3.5 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0 select-none">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="p-4 rounded-2xl max-w-xl glass-panel border-white/5 rounded-tl-none text-zinc-300">
                          <MarkdownText text={streamingMessage} />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <footer className="p-3 md:p-4 border-t border-white/5 bg-black/10 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Ask a question (e.g., 'Do I have any assignments due soon?')"
                    className="flex-1 h-11 px-4 rounded-xl text-sm text-white glass-input outline-none"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || isSending}
                    className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto select-none">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Conversational Thread</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mb-6">
                Create a chat conversation workspace from the sidebar folder directory to trigger completions.
              </p>
              <button
                onClick={() => createConvMutation.mutate()}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-all duration-200 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create Thread</span>
              </button>
            </div>
          )
        )}

        {/* --- TOOLS HOME SELECTION GRID --- */}
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

        {/* --- ACTIVE TOOL RUNNER WORKSPACE --- */}
        {activeTab === 'tools' && activeTool !== null && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scoped Tool Header */}
            <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-black/20">
              <button
                onClick={() => setActiveTool(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 bg-white/[0.01] text-zinc-400 hover:text-white font-semibold text-xs transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>All Tools</span>
              </button>
              <h4 className="text-sm font-extrabold text-white">
                {toolsList.find((t) => t.id === activeTool)?.name}
              </h4>
              <div className="w-20" /> {/* Spacer */}
            </header>

            {/* Split Input / Result Layout Panel */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT COLUMN: Input Configuration Form */}
              <div className="w-80 shrink-0 border-r border-white/5 bg-black/20 p-5 overflow-y-auto">
                <form onSubmit={executeStudyTool} className="space-y-5">
                  <h5 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider">Configure Parameters</h5>
                  
                  {/* PDF Summarizer / Image OCR Upload zones */}
                  {(activeTool === 'summarize-pdf' || activeTool === 'ocr-image') && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Upload File Document</label>
                      <div className="border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.02] p-4 rounded-xl text-center cursor-pointer transition-colors relative">
                        <input
                          type="file"
                          accept={activeTool === 'summarize-pdf' ? '.pdf' : 'image/*'}
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileText className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                        <span className="text-xs font-semibold text-zinc-300 block truncate">
                          {selectedFile ? selectedFile.name : 'Select file target...'}
                        </span>
                        <span className="text-[10px] text-zinc-500 mt-1 block">
                          {activeTool === 'summarize-pdf' ? 'PDF files up to 15MB' : 'JPEG / PNG images'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Smart Study Planner inputs */}
                  {activeTool === 'study-planner' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Study Time (Hours)</label>
                        <input
                          type="number"
                          value={plannerHours}
                          onChange={(e) => setPlannerHours(Number(e.target.value))}
                          min="1"
                          max="24"
                          className="w-full h-10 px-3 rounded-lg text-xs text-white glass-input"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Focus Weak Subjects</label>
                        <div className="space-y-1 max-h-40 overflow-y-auto p-1.5 border border-white/5 rounded-lg bg-black/20">
                          {subjectsList?.map((subj: any) => (
                            <button
                              key={subj.id}
                              type="button"
                              onClick={() => handleToggleWeakSubject(subj.name)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors ${
                                selectedWeakSubjects.includes(subj.name)
                                  ? 'bg-primary/20 text-white font-bold'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              <span>{subj.name}</span>
                              {selectedWeakSubjects.includes(subj.name) && <Check className="w-3.5 h-3.5 text-primary" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Assignment Assistant Selection */}
                  {activeTool === 'assignment-assistant' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Target Assignment</label>
                      <select
                        value={selectedAssignmentId}
                        onChange={(e) => setSelectedAssignmentId(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg text-xs text-white bg-zinc-950 border border-white/5 outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select Assignment...</option>
                        {assignmentsList?.filter((a: any) => a.status !== 'COMPLETED').map((a: any) => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Project Assistant Selection */}
                  {activeTool === 'project-assistant' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Target Project</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg text-xs text-white bg-zinc-950 border border-white/5 outline-none cursor-pointer"
                        required
                      >
                        <option value="">Select Project...</option>
                        {projectsList?.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Revision Notes / Flashcards / Quiz note selections */}
                  {(activeTool === 'revision-notes' || activeTool === 'flashcards' || activeTool === 'quiz') && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Import Notes Content</label>
                        <select
                          value={selectedNoteId}
                          onChange={(e) => setSelectedNoteId(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg text-xs text-white bg-zinc-950 border border-white/5 outline-none cursor-pointer"
                        >
                          <option value="">Select Note...</option>
                          {notesList?.map((note: any) => (
                            <option key={note.id} value={note.id}>{note.title}</option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Topic configuration */}
                      {(activeTool === 'flashcards' || activeTool === 'quiz') && !selectedNoteId && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Custom Topic Keywords</label>
                          <input
                            type="text"
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="e.g. CPU Context Switch SJF"
                            className="w-full h-10 px-3 rounded-lg text-xs text-white glass-input"
                          />
                        </div>
                      )}

                      {/* Manual content input */}
                      {!selectedNoteId && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Manual Text Block</label>
                          <textarea
                            value={customTextContent}
                            onChange={(e) => setCustomTextContent(e.target.value)}
                            placeholder="Paste study material text blocks..."
                            rows={5}
                            className="w-full p-3 rounded-lg text-xs text-white glass-input resize-none"
                            required
                          />
                        </div>
                      )}

                      {/* Quiz configuration */}
                      {activeTool === 'quiz' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">MCQ Questions Limit</label>
                          <input
                            type="number"
                            value={quizQuestionCount}
                            onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                            min="2"
                            max="15"
                            className="w-full h-10 px-3 rounded-lg text-xs text-white glass-input"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={toolLoading}
                    className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {toolLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Run AI Engine</span>
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: Output display view */}
              <div className="flex-1 bg-black/10 overflow-y-auto p-6 flex flex-col justify-between">
                <div>
                  {toolError && (
                    <div className="p-4 mb-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2 select-text">
                      <X className="w-4 h-4 shrink-0" />
                      <span>{toolError}</span>
                    </div>
                  )}

                  {/* Loading placeholder skeleton */}
                  {toolLoading && (
                    <div className="space-y-4 animate-pulse py-8">
                      <div className="h-6 w-44 bg-white/5 rounded-lg" />
                      <div className="space-y-2">
                        <div className="h-4 bg-white/5 rounded w-full" />
                        <div className="h-4 bg-white/5 rounded w-5/6" />
                        <div className="h-4 bg-white/5 rounded w-2/3" />
                      </div>
                    </div>
                  )}

                  {/* Empty Awaiting state card */}
                  {!toolLoading &&
                    !pdfSummaryResult &&
                    !ocrResult &&
                    plannerResult.length === 0 &&
                    assignmentTasks.length === 0 &&
                    !revisionNotesResult &&
                    flashcardsResult.length === 0 &&
                    quizResult.length === 0 &&
                    projectTasks.length === 0 && (
                      <div className="h-[40vh] flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto select-none">
                        <Bot className="w-10 h-10 text-zinc-600 mb-3" />
                        <h4 className="text-white font-bold text-sm">Awaiting Outputs</h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          Upload parameters, notes, or topics on the left side form and trigger the AI execution wrapper.
                        </p>
                      </div>
                    )}

                  {/* OUTPUT RENDERING TARGETS */}
                  {!toolLoading && (
                    <>
                      {/* 1. PDF Summarizer Output */}
                      {activeTool === 'summarize-pdf' && pdfSummaryResult && (
                        <div className="space-y-4 select-text">
                          <h4 className="text-base font-extrabold text-white">Generated PDF Summary</h4>
                          <MarkdownText text={pdfSummaryResult} />
                        </div>
                      )}

                      {/* 2. Image OCR Output */}
                      {activeTool === 'ocr-image' && ocrResult && (
                        <div className="space-y-4 select-text">
                          <h4 className="text-base font-extrabold text-white">Extracted Image Text</h4>
                          <pre className="p-4 rounded-xl border border-white/5 bg-zinc-950/40 text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {ocrResult}
                          </pre>
                        </div>
                      )}

                      {/* 3. Revision Notes Output */}
                      {activeTool === 'revision-notes' && revisionNotesResult && (
                        <div className="space-y-4 select-text">
                          <h4 className="text-base font-extrabold text-white">Revision Study Guide</h4>
                          <MarkdownText text={revisionNotesResult} />
                        </div>
                      )}

                      {/* 4. Smart Study Planner Output */}
                      {activeTool === 'study-planner' && plannerResult.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-base font-extrabold text-white">Proposed Study Schedule</h4>
                          <div className="divide-y divide-white/5 space-y-3">
                            {plannerResult.map((block, index) => (
                              <div key={index} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <span className="text-sm font-bold text-zinc-200 block truncate">{block.activity}</span>
                                  <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">Timeline: {block.time}</span>
                                </div>
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                                  block.priority === 'HIGH' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                }`}>
                                  {block.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. Assignment Assistant Output */}
                      {activeTool === 'assignment-assistant' && assignmentTasks.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-base font-extrabold text-white">Decomposed Assignment Milestones</h4>
                          <div className="divide-y divide-white/5 space-y-3">
                            {assignmentTasks.map((t, index) => (
                              <div key={index} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                  <span className="text-xs font-semibold text-zinc-300 leading-normal">{t.title}</span>
                                </div>
                                <span className="text-[8px] font-extrabold text-zinc-500 border border-white/5 px-1.5 py-0.5 rounded uppercase shrink-0">
                                  {t.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. Project Assistant Output */}
                      {activeTool === 'project-assistant' && projectTasks.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-base font-extrabold text-white">Kanban Task Suggestions</h4>
                          <div className="divide-y divide-white/5 space-y-3">
                            {projectTasks.map((t, index) => (
                              <div key={index} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                  <span className="text-xs font-semibold text-zinc-300 leading-normal">{t.title}</span>
                                </div>
                                <span className="text-[8px] font-extrabold text-zinc-500 border border-white/5 px-1.5 py-0.5 rounded uppercase shrink-0">
                                  {t.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 7. Flashcards Interactive Slide Stack Output */}
                      {activeTool === 'flashcards' && flashcardsResult.length > 0 && (
                        <div className="space-y-6 flex flex-col items-center justify-center py-4">
                          <h4 className="text-base font-extrabold text-white self-start">Review Flashcards</h4>
                          
                          {/* Flashcard Body flipped via CSS rotation simulated state */}
                          <div
                            onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                            className="w-full max-w-sm h-48 rounded-2xl border border-white/10 bg-zinc-950/45 cursor-pointer relative overflow-hidden select-none hover:border-primary/40 transition-all flex flex-col items-center justify-center p-6 text-center text-sm shadow-2xl"
                          >
                            {!flashcardFlipped ? (
                              <div className="space-y-3">
                                <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                                  Question
                                </span>
                                <h5 className="text-base font-extrabold text-white max-h-36 overflow-y-auto leading-relaxed select-text">
                                  {flashcardsResult[flashcardIndex]?.front}
                                </h5>
                                <span className="text-[10px] text-zinc-500 block">Click to reveal answer</span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                                  Definition / Answer
                                </span>
                                <p className="text-xs text-zinc-300 max-h-36 overflow-y-auto leading-relaxed select-text">
                                  {flashcardsResult[flashcardIndex]?.back}
                                </p>
                                <span className="text-[10px] text-zinc-500 block">Click to return to front</span>
                              </div>
                            )}
                          </div>

                          {/* Index Navigation Sliders */}
                          <div className="flex items-center gap-4">
                            <button
                              disabled={flashcardIndex === 0}
                              onClick={() => {
                                setFlashcardIndex((prev) => prev - 1);
                                setFlashcardFlipped(false);
                              }}
                              className="p-2 rounded-lg border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs text-zinc-500 font-bold">
                              Card {flashcardIndex + 1} of {flashcardsResult.length}
                            </span>
                            <button
                              disabled={flashcardIndex === flashcardsResult.length - 1}
                              onClick={() => {
                                setFlashcardIndex((prev) => prev + 1);
                                setFlashcardFlipped(false);
                              }}
                              className="p-2 rounded-lg border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 8. Quiz Lab Interactive MCQs Checklist Output */}
                      {activeTool === 'quiz' && quizResult.length > 0 && (
                        <div className="space-y-6 select-text">
                          <h4 className="text-base font-extrabold text-white">Practice Quiz Lab</h4>
                          <div className="space-y-6">
                            {quizResult.map((q, idx) => {
                              const selectedAnswer = quizAnswers[idx];
                              const isCorrect = selectedAnswer === q.answer;
                              const showExplanation = showQuizExplanation[idx] ?? false;

                              return (
                                <div key={idx} className="p-4 rounded-xl border border-white/5 bg-zinc-950/20 space-y-4">
                                  <h5 className="text-sm font-extrabold text-white flex items-start gap-2.5 leading-relaxed select-text">
                                    <span className="text-primary">{idx + 1}.</span>
                                    <span>{q.question}</span>
                                  </h5>

                                  {/* Radio Options Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {q.options.map((opt: string) => {
                                      const isOptionSelected = selectedAnswer === opt;
                                      const isOptionCorrect = opt === q.answer;
                                      
                                      let borderStyle = 'border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.02]';
                                      if (selectedAnswer) {
                                        if (isOptionCorrect) borderStyle = 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400';
                                        else if (isOptionSelected) borderStyle = 'border-red-500/25 bg-red-500/10 text-red-400';
                                      }

                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          disabled={!!selectedAnswer}
                                          onClick={() => setQuizAnswers((prev) => ({ ...prev, [idx]: opt }))}
                                          className={`px-3 py-2.5 border rounded-lg text-left text-xs font-semibold leading-relaxed transition-all ${borderStyle}`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Explanatory details dropdown */}
                                  {selectedAnswer && (
                                    <div className="space-y-2 border-t border-white/5 pt-3 mt-1 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className={`font-bold flex items-center gap-1 ${isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                                          {isCorrect ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
                                          <span>{isCorrect ? 'Correct Answer' : 'Incorrect Choice'}</span>
                                        </span>
                                        <button
                                          onClick={() => setShowQuizExplanation((prev) => ({ ...prev, [idx]: !showExplanation }))}
                                          className="text-zinc-500 hover:text-white font-semibold underline text-[10px]"
                                        >
                                          {showExplanation ? 'Hide Explanation' : 'Explain Reasoning'}
                                        </button>
                                      </div>
                                      {showExplanation && (
                                        <p className="text-zinc-400 leading-relaxed pl-1 bg-white/[0.005] p-2 rounded border border-white/5 select-text">
                                          {q.explanation}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* BOTTOM FOOTER: Import / Sync Actions bar */}
                {!toolLoading && (
                  <>
                    {/* PDF Summarizer / Revision Notes sync note options */}
                    {((activeTool === 'summarize-pdf' && pdfSummaryResult) ||
                      (activeTool === 'revision-notes' && revisionNotesResult)) && (
                      <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                        <button
                          disabled={importState.note !== 'idle'}
                          onClick={() => {
                            const title = activeTool === 'summarize-pdf' ? `Summary: ${selectedFile?.name || 'PDF'}` : 'Revision Notes';
                            const content = activeTool === 'summarize-pdf' ? pdfSummaryResult : revisionNotesResult;
                            handleSaveTextAsNote(title, content);
                          }}
                          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          {importState.note === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : importState.note === 'success' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {importState.note === 'loading' ? 'Saving note...' : importState.note === 'success' ? 'Saved to Notes!' : 'Save as Note'}
                          </span>
                        </button>
                      </footer>
                    )}

                    {/* OCR direct clipboard / note sync */}
                    {activeTool === 'ocr-image' && ocrResult && (
                      <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                        <button
                          onClick={() => navigator.clipboard.writeText(ocrResult)}
                          className="h-10 px-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy to Clipboard</span>
                        </button>
                        <button
                          disabled={importState.note !== 'idle'}
                          onClick={() => handleSaveTextAsNote(`OCR: ${selectedFile?.name || 'Image'}`, ocrResult)}
                          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          {importState.note === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : importState.note === 'success' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {importState.note === 'loading' ? 'Saving note...' : importState.note === 'success' ? 'Saved to Notes!' : 'Save as Note'}
                          </span>
                        </button>
                      </footer>
                    )}

                    {/* Smart Planner Import */}
                    {activeTool === 'study-planner' && plannerResult.length > 0 && (
                      <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                        <button
                          disabled={importState.tasks !== 'idle'}
                          onClick={handleImportTasksToPlanner}
                          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          {importState.tasks === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : importState.tasks === 'success' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {importState.tasks === 'loading' ? 'Importing schedule...' : importState.tasks === 'success' ? 'Imported to Planner!' : 'Import to Planner'}
                          </span>
                        </button>
                      </footer>
                    )}

                    {/* Assignment Assistant subtasks Import */}
                    {activeTool === 'assignment-assistant' && assignmentTasks.length > 0 && (
                      <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                        <button
                          disabled={importState.tasks !== 'idle'}
                          onClick={() => handleImportTasksToBoard('assignment', selectedAssignmentId, assignmentTasks)}
                          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          {importState.tasks === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : importState.tasks === 'success' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <ClipboardList className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {importState.tasks === 'loading' ? 'Importing milestones...' : importState.tasks === 'success' ? 'Imported to Board!' : 'Import to Board'}
                          </span>
                        </button>
                      </footer>
                    )}

                    {/* Project Assistant Kanban tasks Import */}
                    {activeTool === 'project-assistant' && projectTasks.length > 0 && (
                      <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                        <button
                          disabled={importState.tasks !== 'idle'}
                          onClick={() => handleImportTasksToBoard('project', selectedProjectId, projectTasks)}
                          className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                          {importState.tasks === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : importState.tasks === 'success' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <ClipboardList className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {importState.tasks === 'loading' ? 'Importing tasks...' : importState.tasks === 'success' ? 'Imported to Board!' : 'Import to Board'}
                          </span>
                        </button>
                      </footer>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Settings Overlay dialog */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md z-50 animate-fade-in-up">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden relative shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-white">AI Assistant Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <span>AI Provider Model</span>
                  <span title="Select cloud endpoints or locally hosted LLM engines."><HelpCircle className="w-3.5 h-3.5 text-zinc-600" /></span>
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-sm text-white bg-zinc-950 border border-white/5 focus:border-primary outline-none cursor-pointer"
                >
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                  <option value="deepseek">DeepSeek AI</option>
                  <option value="ollama">Ollama (Local LLM)</option>
                  <option value="lmstudio">LM Studio (Local LLM)</option>
                </select>
              </div>

              {['openai', 'gemini', 'claude', 'deepseek'].includes(provider) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                    API Credentials Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={settings?.apiKey ? '••••••••••••••••' : 'Enter API Key (write "mock" for testing)'}
                      className="w-full h-10 pl-3 pr-10 rounded-xl text-sm text-white glass-input outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3.5 top-3 text-zinc-500 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Keys are masked for security. If empty, the backend falls back to environment variables. Set to <code className="text-primary font-bold">mock</code> to activate local sandbox mode.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                    Active Model Name
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gpt-4o-mini"
                    className="w-full h-10 px-3 rounded-xl text-sm text-white glass-input outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                    API Endpoint Base (Optional)
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="Defaults to standard provider URL"
                    className="w-full h-10 px-3 rounded-xl text-sm text-white glass-input outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                      <span>Temperature</span>
                      <span className="text-primary font-semibold">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.5"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1 accent-primary bg-white/10 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                      Max Tokens Limit
                    </label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl text-sm text-white glass-input outline-none"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">
                    Core System Instructions (Prompt)
                  </label>
                  <textarea
                    rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Instruct the model on its identity and tone."
                    className="w-full p-3 rounded-xl text-sm text-white glass-input outline-none resize-none leading-normal"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 h-10 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {saveSettingsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Config</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
