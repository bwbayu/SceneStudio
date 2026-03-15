import { useState } from 'react';
import { XIcon, MagicIcon } from './Icons';

interface AssetGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'actor' | 'theme' | 'script' | 'scene';
  onSave: (type: string, data: { prompt: string; previewImage: string }) => void;
  initialImage?: string;
}

export default function AssetGenerationModal({ isOpen, onClose, type, onSave, initialImage }: AssetGenerationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [previewImage, setPreviewImage] = useState(initialImage ?? '');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      // Simulation: reuse the initial image or a placeholder
      setPreviewImage(initialImage || 'https://via.placeholder.com/600x400/1a1a1a/c8a45a?text=Generated+Asset');
      setIsGenerating(false);
    }, 2000);
  };

  const handleSave = () => {
    onSave(type, { prompt, previewImage });
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'actor': return 'Generate New Actor';
      case 'theme': return 'Generate Surroundings';
      case 'script': return 'AI Script Magic';
      case 'scene': return 'Generate Scene Visual';
      default: return 'AI Generator';
    }
  };

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-[fade-in]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="glass relative w-full max-w-2xl animate-[scale-in] overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-2xl">
        
        {/* Header Ribbon */}
        <div className="absolute left-0 top-0 z-10">
          <div className="bg-linear-to-r rom-(--color-accent-primary) to-(--color-accent-secondary) px-5 py-2.5 shadow-lg flex items-center gap-2">
            <MagicIcon className="h-3.5 w-3.5 text-black" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black italic" style={{ fontFamily: "'Sora', sans-serif" }}>
              {getTitle()}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-text-muted hover:text-text-primary transition-colors hover:scale-110"
        >
          <XIcon className="h-6 w-6" />
        </button>

        {/* Modal Content */}
        <div className="px-8 pb-8 pt-20">
          
          {/* Main Preview Box (Image 2 style) */}
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl border border-border-default bg-bg-secondary shadow-inner">
            {isGenerating ? (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-(--color-accent-primary) border-t-transparent" />
                <p className="text-sm font-medium text-text-secondary animate-pulse">Dreaming up your asset...</p>
              </div>
            ) : previewImage ? (
              <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-10">
                <div className="rounded-full bg-white/5 p-5">
                   <MagicIcon className="h-10 w-10 text-text-muted opacity-50" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
                  Preview Generated {type}
                </p>
              </div>
            )}
            
            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          {/* Prompt + Generate Row */}
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-border-default bg-black/40 p-2 focus-within:border-(--color-accent-primary)/50 transition-all">
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe the ${type} you want to generate...`}
              className="flex-1 bg-transparent px-4 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="rounded-lg bg-(--color-accent-primary) px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              Generate
            </button>
          </div>

          {/* Save Button (Centered) */}
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              disabled={isGenerating || !previewImage}
              className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-12 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-(--color-accent-primary)/20 transition-all hover:scale-[1.05] hover:shadow-(--color-accent-primary)/40 active:scale-[0.95] disabled:opacity-30 disabled:hover:scale-100"
            >
              Save Asset
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Decorative Glows */}
        <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.05] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.05] blur-[100px]" />
      </div>
    </div>
  );
}
