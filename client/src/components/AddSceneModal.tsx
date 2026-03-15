import { useState } from 'react';
import { XIcon, MagicIcon } from './Icons';
import type { Actor, Theme, Scene } from '../api';

interface AddSceneFormData {
  scene_description: string;
  actor_ids: string[];
  theme_id: string | null;
  prev_scene_ids: string[];
  next_scene_ids: string[];
}

interface AddSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  actors: Actor[];
  themes: Theme[];
  onSubmit: (data: AddSceneFormData) => void;
}

type ScenePosition = 'middle' | 'end';

export default function AddSceneModal({
  isOpen,
  onClose,
  scenes,
  actors,
  themes,
  onSubmit,
}: AddSceneModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState<ScenePosition>('middle');
  const [prevSceneIds, setPrevSceneIds] = useState<string[]>([]);
  const [nextSceneIds, setNextSceneIds] = useState<string[]>([]);
  const [actorIds, setActorIds] = useState<string[]>([]);
  const [themeId, setThemeId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setDescription('');
    setPosition('middle');
    setPrevSceneIds([]);
    setNextSceneIds([]);
    setActorIds([]);
    setThemeId(null);
    onClose();
  };

  const togglePrevScene = (id: string) => {
    setPrevSceneIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleNextScene = (id: string) => {
    setNextSceneIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleActor = (id: string) => {
    setActorIds(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, id];
    });
  };

  const canProceedStep1 = description.trim().length > 0;
  const canProceedStep2 =
    prevSceneIds.length > 0 && (position === 'end' || nextSceneIds.length > 0);

  const handleSubmit = () => {
    onSubmit({
      scene_description: description.trim(),
      actor_ids: actorIds,
      theme_id: themeId,
      prev_scene_ids: prevSceneIds,
      next_scene_ids: position === 'end' ? [] : nextSceneIds,
    });
  };

  const stepLabel = ['Scene Description', 'Scene Position', 'Assets'];

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-[fade-in]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="glass relative w-full max-w-lg animate-[scale-in] overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-2xl">
        {/* Header Ribbon */}
        <div className="absolute left-0 top-0 z-10">
          <div className="bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-5 py-2.5 shadow-lg flex items-center gap-2">
            <MagicIcon className="h-3.5 w-3.5 text-black" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-black italic" style={{ fontFamily: "'Sora', sans-serif" }}>
              Add Scene
            </span>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 text-text-muted hover:text-text-primary transition-colors hover:scale-110"
        >
          <XIcon className="h-6 w-6" />
        </button>

        <div className="px-8 pb-8 pt-20">
          {/* Step indicators */}
          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition-colors ${
                    s < step
                      ? 'bg-(--color-accent-primary) text-black'
                      : s === step
                      ? 'bg-(--color-accent-primary)/20 border border-(--color-accent-primary) text-(--color-accent-primary)'
                      : 'bg-white/5 text-text-muted'
                  }`}
                >
                  {s < step ? '✓' : s}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${s === step ? 'text-(--color-accent-primary)' : 'text-text-muted'}`}>
                  {stepLabel[s - 1]}
                </span>
                {s < 3 && <div className="h-px w-6 bg-border-default" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Description ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Describe what happens in this new scene. Be as specific or as vague as you like — the agent will ask clarifying questions if needed.
              </p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. The hero discovers a hidden letter in the old library that changes everything..."
                rows={5}
                className="w-full rounded-xl border border-border-default bg-black/40 px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted resize-none focus:border-(--color-accent-primary)/50 transition-colors"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="rounded-lg bg-(--color-accent-primary) px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Position ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Position selector */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Scene Position</p>
                <div className="flex gap-3">
                  {(['middle', 'end'] as ScenePosition[]).map(pos => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={`flex-1 rounded-lg border px-4 py-2.5 text-xs font-bold capitalize transition-all ${
                        position === pos
                          ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/10 text-(--color-accent-primary)'
                          : 'border-border-default bg-white/5 text-text-secondary hover:bg-white/10'
                      }`}
                    >
                      {pos === 'middle' ? 'Middle of Story' : 'End of Story'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Previous scenes (always required) */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Previous Scene(s) <span className="text-accent-rose">*</span>
                </p>
                <p className="mb-2 text-[10px] text-text-muted">Which existing scene(s) lead to this new scene?</p>
                <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent">
                  {scenes.map(scene => (
                    <button
                      key={scene.scene_id}
                      onClick={() => togglePrevScene(scene.scene_id)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                        prevSceneIds.includes(scene.scene_id)
                          ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/10 text-(--color-accent-primary)'
                          : 'border-border-default bg-white/5 text-text-secondary hover:bg-white/10'
                      }`}
                    >
                      <div className={`h-4 w-4 shrink-0 rounded border ${prevSceneIds.includes(scene.scene_id) ? 'border-(--color-accent-primary) bg-(--color-accent-primary)' : 'border-border-default'} flex items-center justify-center`}>
                        {prevSceneIds.includes(scene.scene_id) && (
                          <svg className="h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate font-bold">{scene.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Next scenes (only for middle) */}
              {position === 'middle' && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Next Scene(s) <span className="text-accent-rose">*</span>
                  </p>
                  <p className="mb-2 text-[10px] text-text-muted">Which existing scene(s) does this new scene lead to?</p>
                  <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent">
                    {scenes.map(scene => (
                      <button
                        key={scene.scene_id}
                        onClick={() => toggleNextScene(scene.scene_id)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                          nextSceneIds.includes(scene.scene_id)
                            ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/10 text-(--color-accent-primary)'
                            : 'border-border-default bg-white/5 text-text-secondary hover:bg-white/10'
                        }`}
                      >
                        <div className={`h-4 w-4 shrink-0 rounded border ${nextSceneIds.includes(scene.scene_id) ? 'border-(--color-accent-primary) bg-(--color-accent-primary)' : 'border-border-default'} flex items-center justify-center`}>
                          {nextSceneIds.includes(scene.scene_id) && (
                            <svg className="h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="truncate font-bold">{scene.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-text-muted hover:text-(--color-accent-primary) transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="rounded-lg bg-(--color-accent-primary) px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Assets ── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Actors */}
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Actors <span className="text-text-muted font-normal normal-case tracking-normal">(select up to 2)</span>
                </p>
                {actors.length === 0 ? (
                  <p className="text-[10px] text-text-muted">No actors in this story.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {actors.map(actor => {
                      const selected = actorIds.includes(actor.actor_id);
                      const disabled = !selected && actorIds.length >= 2;
                      return (
                        <button
                          key={actor.actor_id}
                          onClick={() => toggleActor(actor.actor_id)}
                          disabled={disabled}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                            selected
                              ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/10 text-(--color-accent-primary)'
                              : disabled
                              ? 'border-border-default bg-white/5 text-text-muted opacity-40 cursor-not-allowed'
                              : 'border-border-default bg-white/5 text-text-secondary hover:bg-white/10'
                          }`}
                        >
                          {actor.anchor_image_url ? (
                            <img src={actor.anchor_image_url} alt={actor.name} className="h-6 w-6 rounded object-cover" />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-[10px] font-bold">
                              {actor.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold">{actor.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Theme */}
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Theme / Location <span className="text-text-muted font-normal normal-case tracking-normal">(optional, max 1)</span>
                </p>
                {themes.length === 0 ? (
                  <p className="text-[10px] text-text-muted">No themes in this story.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {themes.map(theme => {
                      const selected = themeId === theme.theme_id;
                      return (
                        <button
                          key={theme.theme_id}
                          onClick={() => setThemeId(selected ? null : theme.theme_id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                            selected
                              ? 'border-(--color-accent-primary) bg-(--color-accent-primary)/10 text-(--color-accent-primary)'
                              : 'border-border-default bg-white/5 text-text-secondary hover:bg-white/10'
                          }`}
                        >
                          {theme.reference_image_url ? (
                            <img src={theme.reference_image_url} alt={theme.location_name} className="h-6 w-10 rounded object-cover" />
                          ) : (
                            <div className="flex h-6 w-10 items-center justify-center rounded bg-white/10 text-[8px] font-bold uppercase">
                              Loc
                            </div>
                          )}
                          <span className="font-bold">{theme.location_name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-text-muted hover:text-(--color-accent-primary) transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-(--color-accent-primary)/20 transition-all hover:scale-[1.05] hover:shadow-(--color-accent-primary)/40 active:scale-[0.95]"
                >
                  <MagicIcon className="h-3.5 w-3.5" />
                  Generate Scene Script
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Decorative glows */}
        <div className="absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.05] blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 -z-10 h-64 w-64 rounded-full bg-(--color-accent-primary) opacity-[0.05] blur-[100px]" />
      </div>
    </div>
  );
}
