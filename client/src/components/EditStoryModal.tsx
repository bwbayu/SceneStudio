import { useState, useEffect } from 'react';
import { XIcon } from './Icons';

interface EditStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: {
    id: string;
    title: string;
    thumbnail: string;
  } | null;
  onSave: (id: string, newThumbnail: string) => void;
}

export default function EditStoryModal({ isOpen, onClose, story, onSave }: EditStoryModalProps) {
  const [prompt, setPrompt] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (story) {
      setPreviewImage(story.thumbnail);
    }
  }, [story]);

  if (!isOpen || !story) return null;

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      // In a real app, this would be an API call returning a new image URL
      const newGeneratedImage = previewImage; // For now simulation

      setIsGenerating(false);
      onSave(story.id, newGeneratedImage);
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
      <div className="glass relative w-full max-w-2xl animate-[scale-in] overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-card)] shadow-2xl">

        {/* Header Ribbon (Styled to match dashboard) */}
        <div className="absolute left-0 top-0 z-10">
          <div className="bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-5 py-2.5 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black italic" style={{ fontFamily: "'Sora', sans-serif" }}>
              Edit Story Frame
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

          {/* Main Preview Box */}
          <div className="relative mb-10 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
                <p className="text-sm font-medium text-[var(--color-text-secondary)] animate-pulse">Generating your masterpiece...</p>
              </div>
            ) : previewImage ? (
              <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-white/5 p-4">
                  <svg className="h-12 w-12 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Preview Generated Story Thumbnail</span>
              </div>
            )}

            {/* Subtle overlay glow */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          {/* Prompt Section */}
          <div className="mb-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[#141414] transition-all duration-300 focus-within:border-[var(--color-accent-primary)]/50 focus-within:shadow-[0_0_20px_rgba(200,164,90,0.05)]">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your story thumbnail in detail..."
                  className="w-full min-h-[120px] bg-transparent px-5 py-4 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)] resize-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                />
                <div className="flex justify-end border-t border-[var(--color-border-default)] bg-black/20 px-4 py-3">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black shadow-lg shadow-[var(--color-accent-primary)]/20 transition-all hover:scale-[1.02] hover:shadow-[var(--color-accent-primary)]/40 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        Generating
                      </>
                    ) : (
                      <>
                        Generate
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
        </div>

        {/* Background Decorative Glows */}
        <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[var(--color-accent-primary)] opacity-[0.03] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-[var(--color-accent-primary)] opacity-[0.03] blur-[100px]" />
      </div>
    </div>
  );
}
