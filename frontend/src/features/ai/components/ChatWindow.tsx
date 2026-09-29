import React from 'react';
import {
  Brain,
  Search,
  Loader2,
  Sparkles,
  Bot,
  User,
  Send,
} from 'lucide-react';
import { MarkdownText } from './MarkdownRenderer';

interface ChatWindowProps {
  activeConvId: string | null;
  provider: string;
  model: string;
  includeRag: boolean;
  setIncludeRag: (v: boolean) => void;
  activeRAGContext: string | null;
  onInspectRAG: () => void;
  loadingMessages: boolean;
  messages: any[];
  isSending: boolean;
  streamingMessage: string | null;
  messageText: string;
  setMessageText: (t: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onCreateConversation?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  activeConvId,
  provider,
  model,
  includeRag,
  setIncludeRag,
  activeRAGContext,
  onInspectRAG,
  loadingMessages,
  messages,
  isSending,
  streamingMessage,
  messageText,
  setMessageText,
  onSendMessage,
  messagesEndRef,
  onCreateConversation,
}) => {
  if (!activeConvId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 mb-4">
          <Bot className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Select a Conversation Thread</h3>
        <p className="text-xs text-zinc-500 max-w-sm mb-6">
          Pick a chat session from the left sidebar or start a new thread using the + button.
        </p>
        {onCreateConversation && (
          <button
            onClick={onCreateConversation}
            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-all duration-200 active:scale-95"
          >
            <span>Create Thread</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIncludeRag(!includeRag)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
              includeRag
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-white/5 bg-white/[0.01] text-zinc-500'
            }`}
          >
            <Brain className="w-3.5 h-3.5 shrink-0" />
            <span>RAG Context</span>
          </button>

          {includeRag && activeRAGContext && (
            <button
              type="button"
              onClick={onInspectRAG}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-[10px] font-bold transition-all animate-pulse"
              title="Inspect retrieved workspace context"
            >
              <Search className="w-3 h-3 shrink-0" />
              <span>Inspect Context</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !messages || messages.length === 0 ? (
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
            {messages.map((m: any) => {
              const isAI = m.role === 'ASSISTANT';
              return (
                <div key={m.id} className={`flex gap-3.5 ${isAI ? 'justify-start' : 'justify-end'}`}>
                  {isAI && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0 select-none">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3 md:p-4 rounded-2xl max-w-[85vw] md:max-w-xl ${
                      isAI
                        ? 'glass-panel border-white/5 rounded-tl-none text-zinc-300'
                        : 'bg-primary text-white rounded-tr-none font-medium'
                    }`}
                  >
                    {isAI ? (
                      <MarkdownText text={m.content} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap select-text leading-relaxed">{m.content}</p>
                    )}
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
              <div className="flex gap-3.5 justify-start select-none">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="glass-panel border-white/5 p-4 rounded-2xl rounded-tl-none max-w-[85vw] md:max-w-xl text-zinc-300">
                  <MarkdownText text={streamingMessage} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Box Footer */}
      <footer className="p-4 border-t border-white/5 bg-black/20 shrink-0">
        <form onSubmit={onSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Ask questions about your notes, exams, or homework..."
            disabled={isSending}
            className="flex-1 h-11 px-4 rounded-xl text-sm text-white glass-input outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSending || !messageText.trim()}
            className="w-11 h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-lg shadow-primary/20 shrink-0"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </footer>
    </div>
  );
};
