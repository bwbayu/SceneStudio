import { useState } from 'react';
import { XIcon } from './Icons';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (prompt: string) => void;
}

export default function CreateStoryModal({ isOpen, onClose, onCreate }: CreateStoryModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!prompt.trim()) return;
    
    setIsCreating(true);
    // Simulate creation/generation
    setTimeout(() => {
      onCreate(prompt);
      setIsCreating(false);
      setPrompt('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fade-in]" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="glass relative w-full max-w-xl animate-[scale-in] overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-card)] shadow-2xl">
        
        {/* Header Ribbon */}
        <div className="absolute left-0 top-0 z-10">
          <div className="bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-5 py-2.5 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black italic" style={{ fontFamily: "'Sora', sans-serif" }}>
              Create Story Frame
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors hover:scale-110 active:scale-95"
        >
          <XIcon className="h-6 w-6" />
        </button>

        {/* Modal Content */}
        <div className="px-8 pb-10 pt-20">
          
          <div className="mb-6 space-y-6">
            {/* Prompt Textarea */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ml-1">
                Thumbnail Prompt
              </label>
              <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[#141414] transition-all duration-300 focus-within:border-[var(--color-accent-primary)]/50 focus-within:shadow-[0_0_20px_rgba(200,164,90,0.05)]">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your new story idea in detail..."
                  className="w-full min-h-[180px] bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] resize-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                />
                <div className="flex justify-end border-t border-[var(--color-border-default)] bg-black/20 px-4 py-3">
                  <button 
                    onClick={handleCreate}
                    disabled={isCreating || !prompt.trim()}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all hover:scale-[1.02] hover:shadow-[var(--color-accent-primary)]/40 active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100"
                  >
                    {isCreating ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Generate & Create
                        <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-[var(--color-text-muted)] italic">
            Initial thumbnail will be generated based on your prompt.
          </p>
        </div>

        {/* Background Decorative Glows */}
        <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[var(--color-accent-primary)] opacity-[0.03] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-[var(--color-accent-primary)] opacity-[0.03] blur-[100px]" />
      </div>
    </div>
  );
}
