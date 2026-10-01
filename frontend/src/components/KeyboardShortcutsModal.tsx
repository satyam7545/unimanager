import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X, Navigation, Monitor } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Navigation & Search',
      icon: Navigation,
      items: [
        { keys: ['Ctrl', 'K'], label: 'Open Command Palette & Global Search' },
        { keys: ['Alt', 'N'], orKeys: ['Ctrl', 'Q'], label: 'Quick Capture (Note, Task, Event)' },
        { keys: ['['], label: 'Toggle Collapsible Sidebar' },
        { keys: ['Alt', '←'], label: 'Navigate Back' },
        { keys: ['Alt', '→'], label: 'Navigate Forward' },
        { keys: ['Esc'], label: 'Close Active Modal / Dropdown' },
      ],
    },
    {
      title: 'Windows Desktop & View',
      icon: Monitor,
      items: [
        { keys: ['F11'], label: 'Toggle Fullscreen Mode' },
        { keys: ['F5'], orKeys: ['Ctrl', 'R'], label: 'Reload Application State' },
        { keys: ['Ctrl', '+'], label: 'Zoom In UI Interface' },
        { keys: ['Ctrl', '-'], label: 'Zoom Out UI Interface' },
        { keys: ['Ctrl', '0'], label: 'Reset UI Zoom to 100%' },
        { keys: ['?'], label: 'Show this Keyboard Shortcuts Cheatsheet' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg glass-panel rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Windows Keyboard Shortcuts</h3>
                <p className="text-[11px] text-zinc-500 font-medium">Quick keybindings for smooth desktop navigation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcuts Content */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {shortcutSections.map((section, idx) => {
              const SectionIcon = section.icon;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <SectionIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{section.title}</span>
                  </div>

                  <div className="space-y-2">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <span className="text-xs text-zinc-300 font-medium pr-3">{item.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, kIdx) => (
                            <kbd
                              key={kIdx}
                              className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/15 text-[11px] font-mono font-bold text-zinc-200 shadow-sm"
                            >
                              {k}
                            </kbd>
                          ))}
                          {item.orKeys && (
                            <>
                              <span className="text-[10px] text-zinc-600 px-0.5 font-semibold">or</span>
                              {item.orKeys.map((k, kIdx) => (
                                <kbd
                                  key={kIdx}
                                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/15 text-[11px] font-mono font-bold text-zinc-200 shadow-sm"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Tip: Press <kbd className="font-mono bg-white/5 px-1 rounded text-zinc-400">?</kbd> anywhere to open</span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
