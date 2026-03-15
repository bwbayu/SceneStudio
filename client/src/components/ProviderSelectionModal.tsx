import { useState } from 'react';
import { XIcon } from './Icons';

interface ProviderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (provider: 'apixo' | 'gemini') => void;
}

const providers = [
  {
    id: 'apixo' as const,
    name: 'Apixo',
    description: 'Fast, high-quality video generation with cinematic style output.',
    badge: null,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-(--color-accent-primary) opacity-20" />
        <path d="M8 22L16 10L24 22H8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" className="text-(--color-accent-primary)" />
        <circle cx="16" cy="17" r="2" fill="currentColor" className="text-(--color-accent-primary)" />
      </svg>
    ),
  },
  {
    id: 'gemini' as const,
    name: 'Gemini',
    description: 'Google\'s Veo model for expressive, high-fidelity video scenes.',
    badge: null,
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-(--color-accent-secondary) opacity-20" />
        <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-(--color-accent-secondary)" />
        <path d="M16 6v20M6 16h20" stroke="currentColor" strokeWidth="1.5" className="text-(--color-accent-secondary)" />
        <circle cx="16" cy="16" r="3" fill="currentColor" className="text-(--color-accent-secondary)" />
      </svg>
    ),
  },
];

export default function ProviderSelectionModal({ isOpen, onClose, onConfirm }: ProviderSelectionModalProps) {
  const [selected, setSelected] = useState<'apixo' | 'gemini'>('apixo');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-160 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-[fade-in]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-[scale-in] overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-2xl">

        {/* Header Ribbon */}
        <div className="absolute left-0 top-0 z-10">
          <div className="bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-5 py-2.5 shadow-lg flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4V2a1 1 0 0 1 2 0v2h6V2a1 1 0 0 1 2 0v2h1a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h3zm-3 6v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V10H4z"/>
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black italic" style={{ fontFamily: "'Sora', sans-serif" }}>
              Select Provider
            </span>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-text-muted hover:text-text-primary transition-colors hover:scale-110"
        >
          <XIcon className="h-6 w-6" />
        </button>

        {/* Content */}
        <div className="px-8 pb-8 pt-20">
          <p className="mb-6 text-sm text-text-secondary" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Choose the AI provider to generate the scene video.
          </p>

          {/* Provider Cards */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setSelected(provider.id)}
                className={`group relative flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-200 ${
                  selected === provider.id
                    ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/10 shadow-lg shadow-(--color-accent-primary)/10'
                    : 'border-border-default bg-white/5 hover:border-border-hover hover:bg-white/8'
                }`}
              >
                {provider.badge && (
                  <span className="absolute right-3 top-3 rounded-full bg-(--color-accent-primary)/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-(--color-accent-primary)">
                    {provider.badge}
                  </span>
                )}

                {/* Selection indicator */}
                <div className={`absolute left-3 top-3 h-3 w-3 rounded-full border-2 transition-all ${
                  selected === provider.id
                    ? 'border-(--color-accent-primary) bg-(--color-accent-primary)'
                    : 'border-border-hover'
                }`} />

                <div className="mt-4">{provider.icon}</div>

                <div>
                  <p className="text-sm font-bold text-text-primary" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {provider.name}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {provider.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-white/5 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selected)}
              className="flex-1 rounded-xl bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) py-3.5 text-sm font-bold text-black shadow-lg shadow-(--color-accent-primary)/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Generate
            </button>
          </div>
        </div>

        {/* Decorative Glows */}
        <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.05] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-secondary) opacity-[0.05] blur-[100px]" />
      </div>
    </div>
  );
}
