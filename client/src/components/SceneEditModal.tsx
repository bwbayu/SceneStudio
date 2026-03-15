import { useState } from 'react';
import { XIcon, MagicIcon } from './Icons';

interface Scene {
  id: string;
  title: string;
  thumbnail: string;
  script: string;
  nextScenes: string[];
}

interface SceneEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene | null;
  onSave: (updatedScene: Scene) => void;
}

export default function SceneEditModal({ isOpen, onClose, scene, onSave }: SceneEditModalProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'scene'>('identity');
  const [title, setTitle] = useState(scene?.title ?? '');
  const [script] = useState(scene?.script ?? '');
  const [thumbPrompt, setThumbPrompt] = useState('');
  const [scenePrompt, setScenePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [thumbPreview, setThumbPreview] = useState(scene?.thumbnail.includes('\n') ? '' : scene?.thumbnail ?? '');
  const [scenePreview, setScenePreview] = useState('');

  if (!isOpen || !scene) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      if (activeTab === 'identity') {
        setThumbPreview('https://via.placeholder.com/600x400/1a1a1a/c8a45a?text=Scene+Identity+Thumbnail');
      } else {
        setScenePreview('https://via.placeholder.com/600x400/111/c8a45a?text=Video+Scene+Generated');
      }
      setIsGenerating(false);
    }, 1500);
  };

  const handleSave = () => {
    onSave({
      ...scene,
      title,
      script,
      thumbnail: thumbPreview || scene.thumbnail
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-160 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-[fade-in]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="glass relative flex w-full max-w-3xl flex-col animate-[scale-in] overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-text-muted hover:text-text-primary transition-colors hover:scale-110"
        >
          <XIcon className="h-6 w-6" />
        </button>

        {/* Header Tabs */}
        <div className="flex gap-4 px-10 pt-10 pb-6">
          <button
            onClick={() => setActiveTab('identity')}
            className={`rounded-lg px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === 'identity' 
                ? 'bg-(--color-accent-primary) text-black shadow-lg shadow-(--color-accent-primary)/20' 
                : 'bg-white/5 text-text-muted hover:bg-white/10'
            }`}
          >
            Scene Identity
          </button>
          <button
            onClick={() => setActiveTab('scene')}
            className={`rounded-lg px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              activeTab === 'scene' 
                ? 'bg-accent-rose text-white shadow-lg shadow-(--color-accent-rose)/20' 
                : 'bg-white/5 text-text-muted hover:bg-white/10'
            }`}
          >
            Scene
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 px-8 pb-8 pt-2 overflow-y-auto max-h-[80vh] scrollbar-thin">
          
          {activeTab === 'identity' ? (
            <div className="flex flex-col gap-6 animate-[fade-in-up]">
              {/* Title Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Scene Title</label>
                <div className="rounded-xl border border-border-default bg-black/40 p-1 focus-within:border-(--color-accent-primary)/50 transition-all">
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Input field for scene title"
                    className="w-full bg-transparent px-4 py-3 text-sm text-text-primary outline-none"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  />
                </div>
              </div>

              {/* Thumbnail Preview Area */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border-default bg-bg-secondary shadow-inner">
                 {isGenerating && activeTab === 'identity' ? (
                   <div className="flex h-full items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-(--color-accent-primary) border-t-transparent" />
                   </div>
                 ) : thumbPreview ? (
                   <img src={thumbPreview} alt="Thumbnail Preview" className="h-full w-full object-cover" />
                 ) : (
                   <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-10 opacity-30">
                     <MagicIcon className="h-10 w-10" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Preview Generated Thumbnail</p>
                   </div>
                 )}
              </div>

              {/* Thumbnail Prompt Row */}
              <div className="flex items-center gap-3 rounded-xl border border-border-default bg-black/40 p-2 focus-within:border-(--color-accent-primary)/50 transition-all">
                <input 
                  type="text"
                  value={thumbPrompt}
                  onChange={(e) => setThumbPrompt(e.target.value)}
                  placeholder="Input field for thumbnail prompt"
                  className="flex-1 bg-transparent px-4 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="rounded-lg bg-(--color-accent-primary) px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02]"
                >
                  Generate
                </button>
              </div>

              {/* Footer Button */}
              <button
                onClick={() => setActiveTab('scene')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) py-4 text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-(--color-accent-primary)/20 transition-all hover:scale-[1.02]"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-[fade-in-up]">
              {/* Scene Content Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border-default bg-bg-secondary shadow-inner">
                 {isGenerating && activeTab === 'scene' ? (
                   <div className="flex h-full items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-rose border-t-transparent" />
                   </div>
                 ) : scenePreview ? (
                   <img src={scenePreview} alt="Scene Preview" className="h-full w-full object-cover" />
                 ) : (
                   <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-10 opacity-30">
                     <MagicIcon className="h-10 w-10 text-accent-rose" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Preview Generated Scene</p>
                   </div>
                 )}
              </div>

              {/* Video Scene Prompt Row */}
              <div className="flex items-center gap-3 rounded-xl border border-border-default bg-white/5 p-2 focus-within:border-accent-rose/50 transition-all">
                <textarea 
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="Input field for video scene prompt"
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-muted resize-none"
                  rows={3}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="self-end rounded-lg bg-accent-rose px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02]"
                >
                  Generate
                </button>
              </div>

              {/* Footer Save Button */}
              <button
                onClick={handleSave}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-rose to-[#ff4d4d] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-(--color-accent-rose)/20 transition-all hover:scale-[1.02]"
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
