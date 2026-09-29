import React, { useState, useEffect } from 'react';
import { Sliders, HelpCircle, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  onSave: (config: any) => void;
  isSaving: boolean;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  isSaving,
}) => {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setProvider(settings.provider || 'openai');
      setModel(settings.model || 'gpt-4o-mini');
      setEndpoint(settings.endpoint || '');
      setTemperature(settings.temperature !== undefined ? settings.temperature : 0.7);
      setMaxTokens(settings.maxTokens || 2048);
      setSystemPrompt(settings.systemPrompt || '');
      setApiKey('');
    }
  }, [settings, isOpen]);

  const handleProviderChange = (val: string) => {
    setProvider(val);
    if (val === 'gemini') {
      setModel('gemini-1.5-flash');
      setEndpoint('');
    } else if (val === 'claude') {
      setModel('claude-3-5-sonnet-20240620');
      setEndpoint('');
    } else if (val === 'deepseek') {
      setModel('deepseek-chat');
      setEndpoint('https://api.deepseek.com');
    } else if (val === 'ollama') {
      setModel('llama3.2');
      setEndpoint('http://localhost:11434');
    } else if (val === 'lmstudio') {
      setModel('local-model');
      setEndpoint('http://localhost:1234/v1');
    } else {
      setModel('gpt-4o-mini');
      setEndpoint('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      provider,
      apiKey: apiKey.trim(),
      endpoint: endpoint.trim(),
      model: model.trim(),
      temperature,
      maxTokens,
      systemPrompt: systemPrompt.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md z-50 animate-fade-in-up">
      <div className="w-full max-w-md glass-panel rounded-2xl border border-white/5 flex flex-col overflow-hidden relative shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-white">AI Assistant Settings</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
              <span>AI Provider Model</span>
              <span title="Select cloud endpoints or locally hosted LLM engines.">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-600" />
              </span>
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
                Keys are masked for security. If empty, the backend falls back to environment variables. Set to{' '}
                <code className="text-primary font-bold">mock</code> to activate local sandbox mode.
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
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Config</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
