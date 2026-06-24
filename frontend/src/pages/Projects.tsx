import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Github, Trash2, ArrowUpRight, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';
import { ProjectBoard } from '@/pages/ProjectBoard';

export const Projects: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Deep-link redirect handler from search
  React.useEffect(() => {
    const redirectedProjId = localStorage.getItem('selectedProjectId');
    if (redirectedProjId) {
      setSelectedProjectId(redirectedProjId);
      localStorage.removeItem('selectedProjectId');
    }
  }, []);

  // 1. Fetch all projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data.projects;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to create project.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setGithubUrl('');
    setErrorMsg(null);
    setShowAddModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name,
      description,
      githubUrl: githubUrl.trim() || null,
    });
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project? All associated tasks will be deleted.')) {
      deleteMutation.mutate(id);
    }
  };

  if (selectedProjectId) {
    return (
      <ProjectBoard
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Project Manager</h2>
          <p className="text-sm text-zinc-400 mt-1">Organize your code builds and personal milestones in Kanban flows.</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Grid listing */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
          <p className="text-zinc-500 text-sm">No projects created yet. Click "New Project" to start tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects?.map((proj: any) => (
            <GlassCard
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className="border-white/5 flex flex-col justify-between h-48 cursor-pointer relative group"
              glowColor="rgba(139, 92, 246, 0.05)"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors truncate">
                    {proj.name}
                  </h3>
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 border border-white/5 bg-white/[0.01] hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0"
                      title="GitHub Repository"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="space-y-3.5 border-t border-white/5 pt-3.5 mt-4">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-500 uppercase tracking-wide">Progress</span>
                    <span className="text-primary">{Math.round(proj.progress)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      style={{ width: `${proj.progress}%` }}
                      className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1 font-semibold text-[10px] uppercase text-zinc-400 group-hover:text-primary transition-colors">
                    <span>Open Board</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    className="p-1 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 rounded transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-sm glass-panel rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">Create Project</h3>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Thesis Compiler"
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize project goals..."
                  className="w-full h-20 p-3 rounded-lg text-sm text-white glass-input resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">GitHub Repository Link</label>
                <div className="relative">
                  <Github className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white glass-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 h-10 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all"
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
