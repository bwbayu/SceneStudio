import { useState } from 'react';
import { XIcon } from './Icons';
import { apiClient } from '../api/axios';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const GEMINI_KEY_REGEX = /^AIza[A-Za-z0-9_-]{30,}$/;

export default function SettingsModal({ isOpen, onClose, onSave }: SettingsModalProps) {
  if (!isOpen) return null;

  return <SettingsModalInner onClose={onClose} onSave={onSave} />;
}

function SettingsModalInner({ onClose, onSave }: Omit<SettingsModalProps, 'isOpen'>) {
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gemini_api_key') ?? '');
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = async () => {
    const trimmed = geminiKey.trim();
    setValidationError(null);

    if (trimmed && !GEMINI_KEY_REGEX.test(trimmed)) {
      setValidationError('Invalid key format. Gemini API keys start with "AIza".');
      return;
    }

    if (trimmed) {
      setIsValidating(true);
      try {
        // Temporarily set key so the interceptor picks it up
        localStorage.setItem('gemini_api_key', trimmed);
        const { data } = await apiClient.post('/pipeline/validate-key');
        if (!data.valid) {
          localStorage.removeItem('gemini_api_key');
          setValidationError(`Invalid API key: ${data.error}`);
          setIsValidating(false);
          return;
        }
      } catch {
        // Network error — save anyway, will fail on first use
      }
      setIsValidating(false);
      localStorage.setItem('gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('gemini_api_key');
    }

    onSave();
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiKey('');
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fade-in]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="glass relative w-full max-w-md animate-[scale-in] overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-2xl">

        {/* Header Ribbon */}
        <div className="absolute left-0 top-0 z-10">
          <div className="bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-5 py-2.5 shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black italic" style={{ fontFamily: "'Sora', sans-serif" }}>
              API Settings
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-text-muted hover:text-text-primary transition-colors hover:scale-110 active:scale-95"
        >
          <XIcon className="h-6 w-6" />
        </button>

        {/* Modal Content */}
        <div className="px-8 pb-8 pt-20">
          <p className="mb-3 text-xs text-text-muted leading-relaxed">
            Enter your Gemini API key to unlock story and video generation. The key is stored in your browser and sent to this app backend as <code className="font-mono">X-Gemini-Api-Key</code> for generation requests.
          </p>
          <p className="mb-6 text-xs text-amber-300/90 leading-relaxed">
            For safety, we recommend revoking this key in Google AI Studio after using this app.
          </p>

          {/* Gemini API Key Input */}
          <div className="space-y-2 mb-8">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">
              Gemini API Key
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-border-default bg-bg-secondary transition-all duration-300 focus-within:border-(--color-accent-primary)/50 focus-within:shadow-[0_0_20px_rgba(200,164,90,0.05)]">
              <input
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 bg-transparent px-5 py-3.5 text-sm text-text-primary outline-none placeholder:text-text-muted font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="px-4 text-text-muted hover:text-text-primary transition-colors"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {validationError && (
              <p className="text-[10px] text-red-400 ml-1">{validationError}</p>
            )}
            <p className="text-[10px] text-text-muted ml-1">
              Get your key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--color-accent-primary) hover:underline"
              >
                aistudio.google.com/apikey
              </a>
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 rounded-xl border border-border-default bg-transparent px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-text-muted transition-all hover:border-red-500/50 hover:text-red-400 active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={handleSave}
              disabled={isValidating}
              className="flex-2 rounded-xl bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-black shadow-lg shadow-(--color-accent-primary)/20 transition-all hover:scale-[1.02] hover:shadow-(--color-accent-primary)/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? 'Validating...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Background Decorative Glows */}
        <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.03] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.03] blur-[100px]" />
      </div>
    </div>
  );
}
