import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '@/services/api';

interface ProjectBoardProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projectId, onBack }) => {
  const queryClient = useQueryClient();
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({
    ideas: '',
    planned: '',
    in_progress: '',
    testing: '',
    completed: '',
  });

  const columns = [
    { id: 'ideas', name: 'Ideas', color: 'bg-zinc-500' },
    { id: 'planned', name: 'Planned', color: 'bg-blue-500' },
    { id: 'in_progress', name: 'In Progress', color: 'bg-indigo-500' },
    { id: 'testing', name: 'Testing', color: 'bg-orange-500' },
    { id: 'completed', name: 'Completed', color: 'bg-emerald-500' },
  ];

  // 1. Fetch project details (includes tasks)
  const { data: project, isLoading } = useQuery({
    queryKey: ['projectDetails', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data.project;
    },
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDetails', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDetails', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectDetails', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleInputChange = (colId: string, val: string) => {
    setTaskInputs((prev) => ({ ...prev, [colId]: val }));
  };

  const handleCreateTask = (e: React.FormEvent, colId: string) => {
    e.preventDefault();
    const title = taskInputs[colId]?.trim();
    if (!title) return;

    createTaskMutation.mutate({
      title,
      projectId,
      columnId: colId,
      status: colId === 'completed' ? 'DONE' : 'TODO',
      priority: 'MEDIUM',
    });

    setTaskInputs((prev) => ({ ...prev, [colId]: '' }));
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  // --- HTML5 Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop action
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Check if task exists in project to prevent cross-leakage
    const task = project?.tasks?.find((t: any) => t.id === taskId);
    if (!task) return;

    // If card dropped in the same column, skip mutation
    if (task.columnId === targetColId) return;

    // Map column ID to task status
    const status = targetColId === 'completed' ? 'DONE' : 'TODO';

    // Update columnId and status. Recalculation triggers automatically on backend
    updateTaskMutation.mutate({
      id: taskId,
      data: { columnId: targetColId, status },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-44 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-96 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const tasks = project?.tasks || [];

  return (
    <div className="space-y-6 select-none flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white">{project?.name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{project?.description || 'No description'}</p>
          </div>
        </div>

        {/* Global Progress bar */}
        <div className="w-full sm:w-60 space-y-1 bg-white/[0.02] border border-white/5 p-3 rounded-xl backdrop-blur-md">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-zinc-500 uppercase tracking-wide">Project Progress</span>
            <span className="text-primary">{Math.round(project?.progress || 0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
            <div
              style={{ width: `${project?.progress || 0}%` }}
              className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board columns wrapper */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t: any) => t.columnId === col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col bg-zinc-950/20 border border-white/5 rounded-xl p-3.5 space-y-4 min-w-[200px] h-full"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between shrink-0 pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="font-bold text-xs text-zinc-300 uppercase tracking-wider">{col.name}</span>
                </div>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-bold">
                  {colTasks.length}
                </span>
              </div>

              {/* Inline Quick Task Creator */}
              <form onSubmit={(e) => handleCreateTask(e, col.id)} className="flex items-center gap-1.5 shrink-0">
                <input
                  type="text"
                  value={taskInputs[col.id]}
                  onChange={(e) => handleInputChange(col.id, e.target.value)}
                  placeholder="Inline task..."
                  className="flex-1 h-8 px-2.5 rounded-lg text-xs text-white glass-input focus:ring-primary/40"
                />
                <button
                  type="submit"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/95 text-white active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Columns task list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 select-none">
                {colTasks.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-white/5 rounded-lg bg-white/[0.002]">
                    <span className="text-[10px] text-zinc-600 block">Empty Slot</span>
                  </div>
                ) : (
                  colTasks.map((task: any) => {
                    const isDone = task.status === 'DONE';
                    
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`p-3 border border-white/5 bg-zinc-950/40 hover:bg-zinc-900/40 rounded-lg flex flex-col gap-2.5 cursor-grab active:cursor-grabbing hover:border-primary/20 transition-all select-none`}
                      >
                        <div className="flex items-start gap-2 justify-between">
                          <span className={`text-xs font-semibold leading-normal break-words max-w-[85%] ${
                            isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'
                          }`}>
                            {task.title}
                          </span>

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-0.5 text-zinc-700 hover:text-red-400 rounded transition-colors shrink-0"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Drag indicator icon and priority details */}
                        <div className="flex items-center justify-between text-[9px] text-zinc-500 border-t border-white/5 pt-2">
                          <span className="font-extrabold text-[8px] uppercase px-1 rounded bg-white/5">
                            {task.priority || 'MEDIUM'}
                          </span>
                          <span className="text-[8px] text-zinc-600">⠿ DRAG</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
