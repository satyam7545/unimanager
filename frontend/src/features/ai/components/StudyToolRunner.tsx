import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FileCheck,
  Check,
  Loader2,
  Sparkles,
  Bot,
  Copy,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { MarkdownText } from './MarkdownRenderer';

interface StudyToolRunnerProps {
  activeTool: string;
  toolsList: any[];
  setActiveTool: (id: string | null) => void;
  executeStudyTool: (e: React.FormEvent) => void;
  toolLoading: boolean;
  toolError: string | null;

  // Form fields
  selectedFile: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  plannerHours: number;
  setPlannerHours: (h: number) => void;
  selectedWeakSubjects: string[];
  handleToggleWeakSubject: (subj: string) => void;
  selectedAssignmentId: string;
  setSelectedAssignmentId: (id: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  selectedNoteId: string;
  setSelectedNoteId: (id: string) => void;
  customTopic: string;
  setCustomTopic: (t: string) => void;
  customTextContent: string;
  setCustomTextContent: (t: string) => void;
  quizQuestionCount: number;
  setQuizQuestionCount: (c: number) => void;

  // Context lists
  subjectsList: any[] | undefined;
  assignmentsList: any[] | undefined;
  projectsList: any[] | undefined;
  notesList: any[] | undefined;

  // Results
  pdfSummaryResult: string;
  ocrResult: string;
  plannerResult: any[];
  assignmentTasks: any[];
  projectTasks: any[];
  revisionNotesResult: string;
  flashcardsResult: any[];
  quizResult: any[];

  // Flashcards & Quiz states
  flashcardIndex: number;
  setFlashcardIndex: React.Dispatch<React.SetStateAction<number>>;
  flashcardFlipped: boolean;
  setFlashcardFlipped: (f: boolean) => void;
  quizAnswers: Record<number, string>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  showQuizExplanation: Record<number, boolean>;
  setShowQuizExplanation: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  importState: Record<string, 'idle' | 'loading' | 'success'>;
  handleSaveTextAsNote: (title: string, content: string) => void;
  handleImportTasksToEntity: (type: 'project' | 'assignment', targetId: string, list: any[]) => void;
}

export const StudyToolRunner: React.FC<StudyToolRunnerProps> = ({
  activeTool,
  toolsList,
  setActiveTool,
  executeStudyTool,
  toolLoading,
  toolError,
  selectedFile,
  handleFileChange,
  plannerHours,
  setPlannerHours,
  selectedWeakSubjects,
  handleToggleWeakSubject,
  selectedAssignmentId,
  setSelectedAssignmentId,
  selectedProjectId,
  setSelectedProjectId,
  selectedNoteId,
  setSelectedNoteId,
  customTopic,
  setCustomTopic,
  customTextContent,
  setCustomTextContent,
  quizQuestionCount,
  setQuizQuestionCount,
  subjectsList,
  assignmentsList,
  projectsList,
  notesList,
  pdfSummaryResult,
  ocrResult,
  plannerResult,
  assignmentTasks,
  projectTasks,
  revisionNotesResult,
  flashcardsResult,
  quizResult,
  flashcardIndex,
  setFlashcardIndex,
  flashcardFlipped,
  setFlashcardFlipped,
  quizAnswers,
  setQuizAnswers,
  showQuizExplanation,
  setShowQuizExplanation,
  importState,
  handleSaveTextAsNote,
  handleImportTasksToEntity,
}) => {
  const currentTool = toolsList.find((t) => t.id === activeTool);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scoped Tool Header */}
      <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-black/20">
        <button
          type="button"
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 bg-white/[0.01] text-zinc-400 hover:text-white font-semibold text-xs transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>All Tools</span>
        </button>
        <h4 className="text-sm font-extrabold text-white">{currentTool?.name}</h4>
        <div className="w-20" />
      </header>

      {/* Split Input / Result Layout Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT COLUMN: Input Configuration Form */}
        <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 p-5 overflow-y-auto max-h-[45vh] md:max-h-full">
          <form onSubmit={executeStudyTool} className="space-y-5">
            <h5 className="text-xs font-extrabold uppercase text-zinc-400 tracking-wider">Configure Parameters</h5>

            {/* PDF Summarizer / Image OCR Upload zones */}
            {(activeTool === 'summarize-pdf' || activeTool === 'ocr-image') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                  Upload File Document
                </label>
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
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    Study Time (Hours)
                  </label>
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
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    Focus Weak Subjects
                  </label>
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                  Target Assignment
                </label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg text-xs text-white bg-zinc-950 border border-white/5 outline-none cursor-pointer"
                  required
                >
                  <option value="">Select Assignment...</option>
                  {assignmentsList
                    ?.filter((a: any) => a.status !== 'COMPLETED')
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Revision Notes / Flashcards / Quiz note selections */}
            {(activeTool === 'revision-notes' || activeTool === 'flashcards' || activeTool === 'quiz') && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                    Import Notes Content
                  </label>
                  <select
                    value={selectedNoteId}
                    onChange={(e) => setSelectedNoteId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg text-xs text-white bg-zinc-950 border border-white/5 outline-none cursor-pointer"
                  >
                    <option value="">Select Note...</option>
                    {notesList?.map((note: any) => (
                      <option key={note.id} value={note.id}>
                        {note.title}
                      </option>
                    ))}
                  </select>
                </div>

                {(activeTool === 'flashcards' || activeTool === 'quiz') && !selectedNoteId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      Custom Topic Keywords
                    </label>
                    <input
                      type="text"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="e.g. Operating Systems CPU Scheduling"
                      className="w-full h-10 px-3 rounded-lg text-xs text-white glass-input"
                    />
                  </div>
                )}

                {!selectedNoteId && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      Manual Text Block
                    </label>
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

                {activeTool === 'quiz' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                      MCQ Questions Limit
                    </label>
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
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
            >
              {toolLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
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
                            <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">
                              Timeline: {block.time}
                            </span>
                          </div>
                          <span
                            className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border shrink-0 ${
                              block.priority === 'HIGH'
                                ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            }`}
                          >
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

                {/* 7. Flashcards Output */}
                {activeTool === 'flashcards' && flashcardsResult.length > 0 && (
                  <div className="space-y-6 flex flex-col items-center justify-center py-4">
                    <h4 className="text-base font-extrabold text-white self-start">Review Flashcards</h4>

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

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
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
                        type="button"
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

                {/* 8. Quiz Lab Output */}
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {q.options.map((opt: string) => {
                                const isOptionSelected = selectedAnswer === opt;
                                const isOptionCorrect = opt === q.answer;

                                let borderStyle =
                                  'border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/[0.02]';
                                if (selectedAnswer) {
                                  if (isOptionCorrect)
                                    borderStyle = 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400';
                                  else if (isOptionSelected)
                                    borderStyle = 'border-red-500/25 bg-red-500/10 text-red-400';
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

                            {selectedAnswer && (
                              <div className="space-y-2 border-t border-white/5 pt-3 mt-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span
                                    className={`font-bold flex items-center gap-1 ${
                                      isCorrect ? 'text-emerald-500' : 'text-red-400'
                                    }`}
                                  >
                                    {isCorrect ? (
                                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    ) : (
                                      <Circle className="w-4 h-4 shrink-0" />
                                    )}
                                    <span>{isCorrect ? 'Correct Answer' : 'Incorrect Choice'}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowQuizExplanation((prev) => ({ ...prev, [idx]: !showExplanation }))
                                    }
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
              {((activeTool === 'summarize-pdf' && pdfSummaryResult) ||
                (activeTool === 'revision-notes' && revisionNotesResult)) && (
                <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                  <button
                    type="button"
                    disabled={importState.note !== 'idle'}
                    onClick={() => {
                      const title =
                        activeTool === 'summarize-pdf'
                          ? `Summary: ${selectedFile?.name || 'PDF'}`
                          : 'Revision Notes';
                      const content =
                        activeTool === 'summarize-pdf' ? pdfSummaryResult : revisionNotesResult;
                      handleSaveTextAsNote(title, content);
                    }}
                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {importState.note === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : importState.note === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {importState.note === 'loading'
                        ? 'Saving note...'
                        : importState.note === 'success'
                        ? 'Saved to Notes!'
                        : 'Save as Note'}
                    </span>
                  </button>
                </footer>
              )}

              {activeTool === 'ocr-image' && ocrResult && (
                <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(ocrResult)}
                    className="h-10 px-4 rounded-xl border border-white/5 hover:border-white/10 bg-white/[0.01] hover:bg-white/5 text-zinc-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>
                  <button
                    type="button"
                    disabled={importState.note !== 'idle'}
                    onClick={() =>
                      handleSaveTextAsNote(
                        `OCR Scan: ${selectedFile?.name || 'Document'}`,
                        ocrResult
                      )
                    }
                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {importState.note === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : importState.note === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <FileCheck className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {importState.note === 'loading'
                        ? 'Saving note...'
                        : importState.note === 'success'
                        ? 'Saved to Notes!'
                        : 'Save as Note'}
                    </span>
                  </button>
                </footer>
              )}

              {activeTool === 'assignment-assistant' && assignmentTasks.length > 0 && (
                <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                  <button
                    type="button"
                    disabled={importState.tasks !== 'idle'}
                    onClick={() =>
                      handleImportTasksToEntity(
                        'assignment',
                        selectedAssignmentId,
                        assignmentTasks
                      )
                    }
                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {importState.tasks === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : importState.tasks === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {importState.tasks === 'loading'
                        ? 'Syncing subtasks...'
                        : importState.tasks === 'success'
                        ? 'Subtasks Added to Assignment!'
                        : 'Sync Tasks to Assignment'}
                    </span>
                  </button>
                </footer>
              )}

              {activeTool === 'project-assistant' && projectTasks.length > 0 && (
                <footer className="border-t border-white/5 pt-4 mt-6 flex justify-end gap-3 select-none">
                  <button
                    type="button"
                    disabled={importState.tasks !== 'idle'}
                    onClick={() =>
                      handleImportTasksToEntity(
                        'project',
                        selectedProjectId,
                        projectTasks
                      )
                    }
                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {importState.tasks === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : importState.tasks === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {importState.tasks === 'loading'
                        ? 'Syncing tasks...'
                        : importState.tasks === 'success'
                        ? 'Tasks Synced to Project!'
                        : 'Sync Tasks to Kanban'}
                    </span>
                  </button>
                </footer>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
