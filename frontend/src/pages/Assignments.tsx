import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, List, Kanban, Calendar, Clock, Trash2, Edit3, Filter, Paperclip, Download, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { GlassCard } from '@/components/GlassCard';
import { useUIStore } from '@/store/uiStore';

export const Assignments: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedSemester } = useUIStore();
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [semester, setSemester] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('PENDING');
  const [deadline, setDeadline] = useState('');

  const [isUploading, setIsUploading] = useState(false);

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assignmentId', editingAssignment.id);
      return api.post('/attachments/upload', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attId: string) => {
      return api.delete(`/attachments/${attId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingAssignment) return;
    setIsUploading(true);
    uploadAttachmentMutation.mutate(file, {
      onSuccess: (res) => {
        const newAttachment = res.data.attachment;
        setEditingAssignment((prev: any) => ({
          ...prev,
          attachments: prev.attachments ? [...prev.attachments, newAttachment] : [newAttachment],
        }));
      },
      onSettled: () => {
        setIsUploading(false);
        if (e.target) e.target.value = '';
      },
    });
  };

  const handleDeleteAttachment = (attId: string) => {
    deleteAttachmentMutation.mutate(attId, {
      onSuccess: () => {
        setEditingAssignment((prev: any) => ({
          ...prev,
          attachments: prev.attachments ? prev.attachments.filter((a: any) => a.id !== attId) : [],
        }));
      },
    });
  };

  // 1. Fetch assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', subjectFilter, priorityFilter, statusFilter, selectedSemester],
    queryFn: async () => {
      let url = '/assignments?';
      if (subjectFilter) url += `subjectId=${subjectFilter}&`;
      if (priorityFilter) url += `priority=${priorityFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (selectedSemester && selectedSemester !== 'all') {
        url += `semester=${selectedSemester}&`;
      }
      const res = await api.get(url);
      return res.data.assignments;
    },
  });

  // 0. Handle redirect deep linking
  React.useEffect(() => {
    const redirectedAssId = localStorage.getItem('selectedAssignmentId');
    if (redirectedAssId && assignments) {
      const assToEdit = assignments.find((a: any) => a.id === redirectedAssId);
      if (assToEdit) {
        handleOpenEdit(assToEdit);
      }
      localStorage.removeItem('selectedAssignmentId');
    }
  }, [assignments]);

  // 2. Fetch subjects for creation/filtering
  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/subjects');
      return res.data.subjects;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubjectId('');
    setSemester('');
    setPriority('MEDIUM');
    setStatus('PENDING');
    setDeadline('');
    setShowAddModal(false);
    setEditingAssignment(null);
  };

  const handleOpenEdit = (ass: any) => {
    setEditingAssignment(ass);
    setTitle(ass.title);
    setDescription(ass.description || '');
    setSubjectId(ass.subjectId || '');
    setSemester(ass.semester || '');
    setPriority(ass.priority);
    setStatus(ass.status);
    
    // Format ISO string to datetime-local input string format "YYYY-MM-DDThh:mm"
    const dateObj = new Date(ass.deadline);
    const formattedDate = dateObj.toISOString().slice(0, 16);
    setDeadline(formattedDate);
    
    setShowAddModal(true);
  };

  const handleSubjectChange = (val: string) => {
    setSubjectId(val);
    if (val) {
      const selectedSub = subjects?.find((s: any) => s.id === val);
      if (selectedSub?.semester) {
        setSemester(selectedSub.semester);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const payload = {
      title,
      description,
      subjectId: subjectId || null,
      semester: semester || null,
      priority,
      status,
      deadline: new Date(deadline).toISOString(),
    };

    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleUpdateStatus = (id: string, nextStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED') => {
    updateMutation.mutate({ id, data: { status: nextStatus } });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'MEDIUM':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const filteredAssignments = assignments || [];

  return (
    <div className="space-y-8 select-none">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Assignments Tracker</h2>
          <p className="text-sm text-zinc-400 mt-1">Track homework milestones, course summaries, and deadlines.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* List/Board switcher buttons */}
          <div className="flex border border-white/5 bg-white/[0.02] p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-primary/20 text-white shadow-inner' : 'text-zinc-500 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'board' ? 'bg-primary/20 text-white shadow-inner' : 'text-zinc-500 hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold mr-2 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Subject Filter */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
        >
          <option value="">All Subjects</option>
          {subjects?.map((sub: any) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Layout Content mapping */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl border border-white/5" />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
          <p className="text-zinc-500 text-sm">No assignments found matching these filter settings.</p>
        </div>
      ) : viewMode === 'list' ? (
        /* --- 1. LIST VIEW LAYOUT --- */
        <div className="space-y-3">
          {filteredAssignments.map((ass: any) => (
            <div
              key={ass.id}
              className="p-4 border border-white/5 bg-zinc-950/20 backdrop-blur-md rounded-xl hover:bg-zinc-900/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={ass.status === 'COMPLETED'}
                  onChange={() => handleUpdateStatus(ass.id, ass.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
                  className="mt-1 rounded border-white/10 bg-white/5 text-primary focus:ring-primary focus:ring-offset-zinc-950 w-4 h-4 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <span className={`text-sm font-bold block truncate ${
                    ass.status === 'COMPLETED' ? 'text-zinc-500 line-through' : 'text-zinc-200 group-hover:text-white'
                  }`}>
                    {ass.title}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {ass.subject && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold" style={{ backgroundColor: `${ass.subject.color}15`, color: ass.subject.color, border: `1px solid ${ass.subject.color}25` }}>
                        {ass.subject.name}
                      </span>
                    )}
                    {(ass.semester || ass.subject?.semester) && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-primary/20 text-primary border border-primary/30">
                        Sem {ass.semester || ass.subject?.semester}
                      </span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getPriorityColor(ass.priority)}`}>
                      {ass.priority}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1 ml-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Due {new Date(ass.deadline).toLocaleDateString()}</span>
                    </span>
                  </div>
                  {ass.attachments && ass.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ass.attachments.map((att: any) => {
                        const fileUrl = `http://localhost:5000${att.filePath}`;
                        return (
                          <a
                            key={att.id}
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="inline-flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-2 py-0.5 rounded border border-white/5 transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Paperclip className="w-3 h-3 text-zinc-500" />
                            <span>{att.fileName}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 justify-end pl-7 md:pl-0 shrink-0">
                <button
                  onClick={() => handleOpenEdit(ass)}
                  className="p-2 border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/5 text-zinc-500 hover:text-white rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete assignment?')) deleteMutation.mutate(ass.id);
                  }}
                  className="p-2 border border-white/5 hover:border-red-500/20 bg-white/[0.01] hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* --- 2. BOARD VIEW LAYOUT --- */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((columnStatus) => {
            const list = filteredAssignments.filter((ass: any) => ass.status === columnStatus);
            const columnName = columnStatus === 'PENDING' ? 'Pending' : columnStatus === 'IN_PROGRESS' ? 'In Progress' : 'Completed';
            const columnColor = columnStatus === 'PENDING' ? 'bg-zinc-500' : columnStatus === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-emerald-500';

            return (
              <div key={columnStatus} className="space-y-4 flex flex-col h-[65vh]">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${columnColor}`} />
                    <span className="font-bold text-sm text-zinc-300 uppercase tracking-wider">{columnName}</span>
                  </div>
                  <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-semibold">{list.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {list.map((ass: any) => (
                    <GlassCard
                      key={ass.id}
                      hoverEffect={true}
                      className="border-white/5 !p-4 cursor-pointer group"
                      onClick={() => handleOpenEdit(ass)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-sm font-bold truncate block ${
                          ass.status === 'COMPLETED' ? 'text-zinc-500 line-through' : 'text-zinc-200'
                        }`}>
                          {ass.title}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {ass.subject && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-extrabold" style={{ backgroundColor: `${ass.subject.color}15`, color: ass.subject.color }}>
                            {ass.subject.name}
                          </span>
                        )}
                        {(ass.semester || ass.subject?.semester) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-primary/20 text-primary border border-primary/30">
                            Sem {ass.semester || ass.subject?.semester}
                          </span>
                        )}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getPriorityColor(ass.priority)}`}>
                          {ass.priority}
                        </span>
                      </div>

                      {ass.attachments && ass.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {ass.attachments.map((att: any) => {
                            const fileUrl = `http://localhost:5000${att.filePath}`;
                            return (
                              <a
                                key={att.id}
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="inline-flex items-center gap-1 text-[9px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-1.5 py-0.5 rounded border border-white/5 transition-all max-w-[120px] truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Paperclip className="w-2.5 h-2.5 text-zinc-500" />
                                <span className="truncate">{att.fileName}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-4 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(ass.deadline).toLocaleDateString()}</span>
                        </span>

                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete assignment?')) deleteMutation.mutate(ass.id);
                            }}
                            className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-50 animate-fade-in-up">
          <div className="w-full max-w-md glass-panel rounded-xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingAssignment ? 'Edit Assignment' : 'Add Assignment'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assignment Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., DBMS Assignment 2"
                  className="w-full h-10 px-3 rounded-lg text-sm text-white glass-input"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write instructions/notes..."
                  className="w-full h-20 p-3 rounded-lg text-sm text-white glass-input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="">None</option>
                    {subjects?.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="">None / Not Applicable</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-10 px-3 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none"
                    required
                  />
                </div>
              </div>
              {/* Attachments Section inside Modal */}
              {editingAssignment && (
                <div className="space-y-2 border-t border-white/5 pt-4 mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Files & Attachments ({(editingAssignment.attachments || []).length})</span>
                    </label>

                    <label className="cursor-pointer text-[10px] px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary font-semibold border border-primary/30 transition-all flex items-center gap-1">
                      {isUploading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      <span>Upload</span>
                      <input type="file" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                    </label>
                  </div>

                  {(!editingAssignment.attachments || editingAssignment.attachments.length === 0) ? (
                    <p className="text-[11px] text-zinc-500 italic">No files uploaded. Attach references or instructions.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                      {editingAssignment.attachments.map((att: any) => {
                        const fileUrl = `http://localhost:5000${att.filePath}`;
                        return (
                          <div key={att.id} className="flex items-center justify-between p-1.5 rounded bg-zinc-900/60 border border-white/5 text-xs">
                            <span className="truncate text-zinc-300 font-medium max-w-[200px]" title={att.fileName}>
                              {att.fileName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                              <a href={fileUrl} target="_blank" rel="noreferrer" download className="p-0.5 text-zinc-400 hover:text-white transition-colors" title="Download">
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button type="button" onClick={() => { if (window.confirm(`Delete ${att.fileName}?`)) handleDeleteAttachment(att.id); }} className="p-0.5 text-zinc-500 hover:text-red-400 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

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
                  {editingAssignment ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
