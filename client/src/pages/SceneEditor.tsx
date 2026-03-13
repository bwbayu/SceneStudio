import { useState, useRef, useEffect } from 'react';
import {
  MagicIcon,
  ChevronDownIcon,
  XIcon,
  LockIcon,
  ListIcon
} from '../components/Icons';
import AssetGenerationModal from '../components/AssetGenerationModal';
import ProviderSelectionModal from '../components/ProviderSelectionModal';
import type { Story } from '../types';

// Reuse thumbnails for mockup
import actor1 from '../assets/images/img_thumb_1.webp';
import actor2 from '../assets/images/img_thumb_2.webp';
import themeImg from '../assets/images/img_thumb_3.webp';
import bgVideo from '../assets/video/thumb-src.mp4';

interface Scene {
  id: string;
  title: string;
  thumbnail: string;
  script: string;
  nextScenes: string[];
}

interface SceneEditorProps {
  story: Story | undefined;
  onBack: () => void;
  isLoadingStoryboard?: boolean;
}

function Connection({ fromId, toId, isActive, containerRef }: { fromId: string, toId: string, isActive: boolean, containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [coords, setCoords] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

  useEffect(() => {
    const updatePath = () => {
      const fromEl = document.querySelector(`[data-scene-id="${fromId}"]`);
      const toEl = document.querySelector(`[data-scene-id="${toId}"]`);
      const container = containerRef.current;

      if (fromEl && toEl && container) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setCoords({
          x1: fromRect.right - containerRect.left + container.scrollLeft,
          y1: fromRect.top + fromRect.height / 2 - containerRect.top + container.scrollTop,
          x2: toRect.left - containerRect.left + container.scrollLeft,
          y2: toRect.top + toRect.height / 2 - containerRect.top + container.scrollTop
        });
      }
    };

    updatePath();
    window.addEventListener('resize', updatePath);

    // Also update on scroll to handle any potential jitter, 
    // though content-relative coords should be stable.
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', updatePath);
    }

    const observer = new MutationObserver(updatePath);
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', updatePath);
      if (container) {
        container.removeEventListener('scroll', updatePath);
        observer.disconnect();
      }
    };
  }, [fromId, toId, containerRef]);

  if (!coords) return null;

  const dx = coords.x2 - coords.x1;
  const path = `M ${coords.x1} ${coords.y1} C ${coords.x1 + dx * 0.4} ${coords.y1}, ${coords.x2 - dx * 0.4} ${coords.y2}, ${coords.x2} ${coords.y2}`;

  return (
    <g>
      {isActive && (
        <path d={path} stroke="var(--color-accent-rose)" strokeWidth="6" fill="none" className="opacity-20 blur-md transition-all duration-500" />
      )}
      <path d={path} stroke={isActive ? 'var(--color-accent-rose)' : 'var(--color-border-default)'} strokeWidth="2" fill="none" strokeLinecap="round" className="transition-all duration-500" />
      <circle cx={coords.x2} cy={coords.y2} r="3" fill={isActive ? 'var(--color-accent-rose)' : 'var(--color-border-default)'} className="transition-all duration-500" />
    </g>
  );
}

function SceneNode({ scene, isActive, isLocked, isGenerating, onClick, onSelect, onGenerate }: {
  scene: Scene, isActive: boolean, isLocked: boolean, isGenerating: boolean,
  onClick: () => void, onSelect: () => void, onGenerate: () => void
}) {
  return (
    <div
      data-scene-id={scene.id}
      onClick={() => { if (!isLocked && !isGenerating) onSelect(); }}
      className={`group relative flex flex-col items-center animate-[card-enter] ${isLocked ? 'opacity-40 grayscale cursor-not-allowed' : isGenerating ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {isLocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm border border-white/20">
            <LockIcon className="h-8 w-8 text-white" />
          </div>
        </div>
      )}
      <div className={`absolute -inset-4 rounded-2xl blur-xl transition-all duration-500 ${isActive ? 'bg-(--color-accent-primary)/20' : 'bg-transparent'}`} />
      <div
        onClick={(e) => { e.stopPropagation(); if (!isGenerating) onSelect(); }}
        className={`relative w-48 overflow-hidden rounded-xl border p-4 transition-all duration-300 ${isActive
          ? 'border-(--color-accent-primary) bg-bg-card'
          : 'border-border-default bg-bg-secondary hover:border-border-hover'
          }`}
      >
        {/* Thumbnail area */}
        <div className="group/thumb relative mb-3 aspect-4/3 w-full overflow-hidden rounded-lg bg-white">
          <div
            onClick={(e) => { e.stopPropagation(); if (!isGenerating) onClick(); }}
            className={`flex h-full w-full items-center justify-center p-4 text-center transition-transform ${!isGenerating && !isLocked ? 'hover:scale-[1.03] active:scale-[0.98] cursor-pointer' : 'cursor-default'}`}
          >
            <span className="text-sm font-black whitespace-pre-line text-black" style={{ fontFamily: "'Sora', sans-serif" }}>
              {scene.thumbnail}
            </span>
          </div>

          {/* Generating overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--color-accent-primary) border-t-transparent" />
            </div>
          )}

          {/* Generate button — appears on hover, hidden when locked or generating */}
          {!isLocked && !isGenerating && (
            <button
              onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              className="absolute right-2 top-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white opacity-0 transition-all group-hover/thumb:opacity-100 hover:bg-(--color-accent-primary) hover:text-black backdrop-blur-sm"
            >
              Generate
            </button>
          )}
        </div>

        <p className={`text-center text-xs font-black uppercase tracking-widest ${isActive ? 'text-(--color-accent-secondary)' : 'text-text-primary'}`}>
          {isGenerating
            ? <span className="text-(--color-accent-primary) animate-pulse normal-case font-medium">Generating...</span>
            : `${scene.title.toLowerCase()} title`
          }
        </p>
      </div>
    </div>
  );
}

export default function SceneEditor({ story, onBack, isLoadingStoryboard = false }: SceneEditorProps) {
  const [activeSceneId, setActiveSceneId] = useState<string>('scene-1');
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(['scene-1']);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(['scene-1']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    actor: true,
    theme: true,
    script: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      container.scrollLeft += e.deltaY;
    }
  };

  // Panning States
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Generation Modal States
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genType, setGenType] = useState<'actor' | 'theme' | 'script' | 'scene'>('actor');

  // Provider Selection Modal States
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [pendingGenerateSceneId, setPendingGenerateSceneId] = useState<string | null>(null);
  const [generatingSceneIds, setGeneratingSceneIds] = useState<Set<string>>(new Set());


  const actors = [
    { id: 'a1', img: actor1 },
    { id: 'a2', img: actor2 }
  ];
  const theme = themeImg;

  // Auto-hide scrollbar logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const showScrollbar = () => {
      document.documentElement.style.setProperty('--scrollbar-opacity', '1');
      clearTimeout(timer);
      timer = setTimeout(() => {
        document.documentElement.style.setProperty('--scrollbar-opacity', '0');
      }, 1000);
    };

    window.addEventListener('scroll', showScrollbar, true);
    window.addEventListener('wheel', showScrollbar, true);
    window.addEventListener('mousemove', showScrollbar, true);

    return () => {
      window.removeEventListener('scroll', showScrollbar, true);
      window.removeEventListener('wheel', showScrollbar, true);
      window.removeEventListener('mousemove', showScrollbar, true);
      clearTimeout(timer);
    };
  }, []);

  const [scenes] = useState<Scene[]>([
    {
      id: 'scene-1',
      title: 'Scene 1',
      thumbnail: 'Scene 1\nThumbnail',
      script: 'The journey begins in the heart of the forest. The air is thick with magic.',
      nextScenes: ['scene-2-1', 'scene-2-2']
    },
    {
      id: 'scene-2-1',
      title: 'Scene 2.1',
      thumbnail: 'Scene 2.1\nThumbnail',
      script: 'A mysterious path appears on the left, guarded by ancient stone guardians.',
      nextScenes: ['scene-3-1', 'scene-3-2']
    },
    {
      id: 'scene-2-2',
      title: 'Scene 2.2',
      thumbnail: 'Scene 2.2\nThumbnail',
      script: 'You descend into the glowing cavern, where crystals hum with energy.',
      nextScenes: ['scene-3-3', 'scene-3-4']
    },
    {
      id: 'scene-3-1',
      title: 'Scene 3.1',
      thumbnail: 'Scene 3.1\nThumbnail',
      script: 'The guardians awaken, their stone eyes glowing with an ethereal blue light.',
      nextScenes: []
    },
    {
      id: 'scene-3-2',
      title: 'Scene 3.2',
      thumbnail: 'Scene 3.2\nThumbnail',
      script: 'You offer a token of peace, and the guardians crumble back into slumber.',
      nextScenes: []
    },
    {
      id: 'scene-3-3',
      title: 'Scene 3.3',
      thumbnail: 'Scene 3.3\nThumbnail',
      script: 'The crystal heart pulsates, revealing a hidden path to the lost kingdom.',
      nextScenes: []
    },
    {
      id: 'scene-3-4',
      title: 'Scene 3.4',
      thumbnail: 'Scene 3.4\nThumbnail',
      script: 'The cavern starts to collapse, forcing you to make a swift escape.',
      nextScenes: []
    }
  ]);

  // Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;

    setIsDragging(true);
    if (canvasRef.current) {
      setStartX(e.pageX - canvasRef.current.offsetLeft);
      setStartY(e.pageY - canvasRef.current.offsetTop);
      setScrollLeft(canvasRef.current.scrollLeft);
      setScrollTop(canvasRef.current.scrollTop);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    e.preventDefault();
    const x = e.pageX - canvasRef.current.offsetLeft;
    const y = e.pageY - canvasRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    canvasRef.current.scrollLeft = scrollLeft - walkX;
    canvasRef.current.scrollTop = scrollTop - walkY;
  };

  const stopDragging = () => {
    setIsDragging(false);
  };

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

  const handleOpenGen = (type: 'actor' | 'theme' | 'script' | 'scene') => {
    setGenType(type);
    setIsGenModalOpen(true);
  };

  const handleSaveAsset = (type: string, data: { prompt: string; previewImage: string }) => {
    console.log(`Saved ${type} asset:`, data);
  };

  const handleOpenProviderModal = (sceneId: string) => {
    setPendingGenerateSceneId(sceneId);
    setIsProviderModalOpen(true);
  };

  const handleConfirmProvider = (provider: 'apixo' | 'gemini') => {
    if (!pendingGenerateSceneId) return;
    setIsProviderModalOpen(false);
    setGeneratingSceneIds(prev => new Set(prev).add(pendingGenerateSceneId));
    setPendingGenerateSceneId(null);
    // Background job: POST /api/scene/generate-video { scene_id: pendingGenerateSceneId, provider }
    console.log(`Generating scene with provider: ${provider}`);
  };

  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setShowChoices(false); // Reset delay when switching scenes in preview

    // Find where this scene fits in the story tree
    const parentScene = scenes.find(s => s.nextScenes.includes(sceneId));

    if (!parentScene) {
      if (sceneId === 'scene-1') setSelectedPathIds(['scene-1']);
      return;
    }

    const parentIdx = selectedPathIds.indexOf(parentScene.id);
    if (parentIdx !== -1) {
      // Truncate the path to the parent and add this scene as the new branch
      setSelectedPathIds([...selectedPathIds.slice(0, parentIdx + 1), sceneId]);
    }
  };

  const isSceneLocked = (sceneId: string) => {
    return !unlockedIds.includes(sceneId);
  };

  const isPathActive = (fromId: string, toId: string) => {
    const idx = selectedPathIds.indexOf(fromId);
    return idx !== -1 && selectedPathIds[idx + 1] === toId;
  };

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full overflow-hidden bg-bg-primary">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-[fade-in]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-6 z-60 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-bg-secondary text-white backdrop-blur-md transition-all duration-500 hover:scale-[1.15] active:scale-90 shadow-2xl ${isSidebarOpen ? 'lg:left-107.5 left-[calc(85vw-50px)]' : 'left-6'
          }`}
      >
        {isSidebarOpen ? (
          <XIcon className="h-5 w-5 text-accent-rose" />
        ) : (
          <ListIcon className="h-5 w-5 text-(--color-accent-primary)" />
        )}
      </button>

      {/* ============================
          LEFT SIDEBAR (ASSET)
          ============================ */}
      <aside className={`absolute inset-y-0 left-0 z-50 w-120 max-w-[85vw] shrink-0 border-r border-border-default bg-bg-secondary flex flex-col h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 ${isSidebarOpen ? 'lg:w-120' : 'lg:w-0 lg:opacity-0 lg:pointer-events-none'}`}>
        <div className="px-6 py-8 border-b border-border-default">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>Asset</h2>
        </div>

        <div className="flex-1 flex flex-col px-4 py-6 gap-3 min-h-0 overflow-hidden">

          {/* Actor Section */}
          <section className="rounded-xl border border-border-default bg-white/5 overflow-hidden flex flex-col transition-all duration-300">
            <button
              onClick={() => toggleSection('actor')}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Actor</h3>
              <div className={`transition-transform duration-300 ${expandedSections.actor ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDownIcon className="h-4 w-4 text-text-muted" />
              </div>
            </button>
            <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.actor ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="min-h-0">
                <div className="p-4 pt-0">
                  <div
                    onWheel={handleHorizontalWheel}
                    className="flex flex-nowrap gap-3 overflow-x-auto pb-2 scrollbar-none hover:scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent"
                  >
                    {actors.map(actor => (
                      <div key={actor.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg">
                        <img src={actor.img} alt="Actor" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Theme Section */}
          <section className="rounded-xl border border-border-default bg-white/5 overflow-hidden flex flex-col transition-all duration-300">
            <button
              onClick={() => toggleSection('theme')}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Theme</h3>
              <div className={`transition-transform duration-300 ${expandedSections.theme ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDownIcon className="h-4 w-4 text-text-muted" />
              </div>
            </button>
            <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.theme ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="min-h-0">
                <div className="p-0 border-t border-white/5">
                  <div
                    onWheel={handleHorizontalWheel}
                    className="flex flex-nowrap overflow-x-auto scrollbar-none hover:scrollbar-thin"
                  >
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden">
                      {theme ? (
                        <img src={theme} alt="Theme" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5 text-text-muted text-[10px] uppercase tracking-widest font-bold">
                          No Theme Selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Script Section */}
          <section className={`rounded-xl border border-border-default bg-white/5 overflow-hidden flex flex-col transition-all duration-300 min-h-0 ${expandedSections.script ? 'flex-1' : 'flex-none'}`}>
            <button
              onClick={() => toggleSection('script')}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Script</h3>
              <div className={`transition-transform duration-300 ${expandedSections.script ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDownIcon className="h-4 w-4 text-text-muted" />
              </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out min-h-0 ${expandedSections.script ? 'grid-rows-[1fr] opacity-100 flex-1 border-t border-white/5' : 'grid-rows-[0fr] opacity-0 invisible'}`}>
              <div className="overflow-hidden">
                <div className="h-full flex flex-col p-4 pt-0">
                  <div className="mb-4 flex items-center justify-end px-1 gap-2 pt-4">
                    <button
                      onClick={() => handleOpenGen('script')}
                      className="text-text-muted hover:text-(--color-accent-primary) transition-colors"
                    >
                      <MagicIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent">
                    {scenes.map(scene => (
                      <div key={scene.id} className="flex flex-col">
                        <button
                          onClick={() => setActiveSceneId(activeSceneId === scene.id ? '' : scene.id)}
                          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold transition-all duration-300 ${activeSceneId === scene.id
                            ? 'bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary) text-black shadow-lg shadow-(--color-accent-primary)/20'
                            : 'bg-white/5 text-text-primary hover:bg-white/10'
                            }`}
                          style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                          {scene.title}
                          <div className={`transition-transform duration-300 ${activeSceneId === scene.id ? 'rotate-180' : 'rotate-0'}`}>
                            <ChevronDownIcon className="h-4 w-4" />
                          </div>
                        </button>

                        <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${activeSceneId === scene.id
                          ? 'grid-rows-[1fr] opacity-100 mt-2'
                          : 'grid-rows-[0fr] opacity-0 mt-0 invisible'
                          }`}>
                          <div className="min-h-0">
                            <div className="relative rounded-lg bg-accent-rose/10 p-4 border border-accent-rose/20">
                              <p className="text-xs leading-relaxed text-text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                {scene.script}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      {/* Navigation Breadcrumb - Outside Main to prevent scrolling */}
      <div className={`absolute top-6 z-20 transition-all duration-500 ease-in-out pointer-events-none flex items-center ${isSidebarOpen
        ? 'lg:left-120 lg:right-0 lg:justify-center left-20 w-auto opacity-0 lg:opacity-100'
        : 'left-20 w-auto justify-start opacity-100'
        }`}>
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-text-muted hover:text-(--color-accent-primary) transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Dashboard
          </button>
          <span className="text-text-muted">/</span>
          <span className="text-xs font-bold uppercase tracking-widest text-(--color-accent-primary)">{story?.title}</span>
        </div>
      </div>

      {/* ============================
          MAIN CANVAS (FLOW)
          ============================ */}
      <main
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className={`relative flex-1 bg-bg-primary overflow-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Floating Instruction */}
        <div className="fixed bottom-10 right-10 z-20 rounded-full bg-black/60 border border-white/10 px-6 py-3 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            <span className="text-(--color-accent-primary)">Mouse Left Click & Drag</span> to Pan Canvas
          </p>
        </div>

        <div className="relative p-75 min-h-375 min-w-625">
          {/* Global Connection Layer */}
          <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
            <Connection fromId={scenes[0].id} toId={scenes[1].id} isActive={isPathActive(scenes[0].id, scenes[1].id)} containerRef={canvasRef} />
            <Connection fromId={scenes[0].id} toId={scenes[2].id} isActive={isPathActive(scenes[0].id, scenes[2].id)} containerRef={canvasRef} />

            <Connection fromId={scenes[1].id} toId={scenes[3].id} isActive={isPathActive(scenes[1].id, scenes[3].id)} containerRef={canvasRef} />
            <Connection fromId={scenes[1].id} toId={scenes[4].id} isActive={isPathActive(scenes[1].id, scenes[4].id)} containerRef={canvasRef} />

            <Connection fromId={scenes[2].id} toId={scenes[5].id} isActive={isPathActive(scenes[2].id, scenes[5].id)} containerRef={canvasRef} />
            <Connection fromId={scenes[2].id} toId={scenes[6].id} isActive={isPathActive(scenes[2].id, scenes[6].id)} containerRef={canvasRef} />
          </svg>

          <div className="relative z-10 flex flex-col items-center gap-16 lg:flex-row lg:items-center">

            {/* Level 1: Scene 1 */}
            <SceneNode
              scene={scenes[0]}
              isActive={activeSceneId === scenes[0].id}
              isLocked={isSceneLocked(scenes[0].id)}
              isGenerating={generatingSceneIds.has(scenes[0].id)}
              onClick={() => { handleSelectScene(scenes[0].id); setIsPreviewOpen(true); }}
              onSelect={() => handleSelectScene(scenes[0].id)}
              onGenerate={() => handleOpenProviderModal(scenes[0].id)}
            />

            {/* Spacer for Level 1 -> 2 */}
            <div className="hidden lg:block w-32" />

            {/* Branches Area */}
            <div className="flex flex-col gap-48">

              {/* Branch A (Scene 2.1 & descendants) */}
              <div className="flex items-center gap-32">
                <SceneNode
                  scene={scenes[1]}
                  isActive={activeSceneId === scenes[1].id}
                  isLocked={isSceneLocked(scenes[1].id)}
                  isGenerating={generatingSceneIds.has(scenes[1].id)}
                  onClick={() => { handleSelectScene(scenes[1].id); setIsPreviewOpen(true); }}
                  onSelect={() => handleSelectScene(scenes[1].id)}
                  onGenerate={() => handleOpenProviderModal(scenes[1].id)}
                />

                <div className="hidden lg:block w-24" />

                <div className="flex flex-col gap-12">
                  <SceneNode
                    scene={scenes[3]}
                    isActive={activeSceneId === scenes[3].id}
                    isLocked={isSceneLocked(scenes[3].id)}
                    isGenerating={generatingSceneIds.has(scenes[3].id)}
                    onClick={() => { handleSelectScene(scenes[3].id); setIsPreviewOpen(true); }}
                    onSelect={() => handleSelectScene(scenes[3].id)}
                    onGenerate={() => handleOpenProviderModal(scenes[3].id)}
                  />
                  <SceneNode
                    scene={scenes[4]}
                    isActive={activeSceneId === scenes[4].id}
                    isLocked={isSceneLocked(scenes[4].id)}
                    isGenerating={generatingSceneIds.has(scenes[4].id)}
                    onClick={() => { handleSelectScene(scenes[4].id); setIsPreviewOpen(true); }}
                    onSelect={() => handleSelectScene(scenes[4].id)}
                    onGenerate={() => handleOpenProviderModal(scenes[4].id)}
                  />
                </div>
              </div>

              {/* Branch B (Scene 2.2 & descendants) */}
              <div className="flex items-center gap-32">
                <SceneNode
                  scene={scenes[2]}
                  isActive={activeSceneId === scenes[2].id}
                  isLocked={isSceneLocked(scenes[2].id)}
                  isGenerating={generatingSceneIds.has(scenes[2].id)}
                  onClick={() => { handleSelectScene(scenes[2].id); setIsPreviewOpen(true); }}
                  onSelect={() => handleSelectScene(scenes[2].id)}
                  onGenerate={() => handleOpenProviderModal(scenes[2].id)}
                />

                <div className="hidden lg:block w-24" />

                <div className="flex flex-col gap-12">
                  <SceneNode
                    scene={scenes[5]}
                    isActive={activeSceneId === scenes[5].id}
                    isLocked={isSceneLocked(scenes[5].id)}
                    isGenerating={generatingSceneIds.has(scenes[5].id)}
                    onClick={() => { handleSelectScene(scenes[5].id); setIsPreviewOpen(true); }}
                    onSelect={() => handleSelectScene(scenes[5].id)}
                    onGenerate={() => handleOpenProviderModal(scenes[5].id)}
                  />
                  <SceneNode
                    scene={scenes[6]}
                    isActive={activeSceneId === scenes[6].id}
                    isLocked={isSceneLocked(scenes[6].id)}
                    isGenerating={generatingSceneIds.has(scenes[6].id)}
                    onClick={() => { handleSelectScene(scenes[6].id); setIsPreviewOpen(true); }}
                    onSelect={() => handleSelectScene(scenes[6].id)}
                    onGenerate={() => handleOpenProviderModal(scenes[6].id)}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main >

      {/* Storyboard Loading Overlay */}
      {isLoadingStoryboard && (
        <div className="absolute inset-y-0 right-0 z-100 flex flex-col items-center justify-center gap-6 bg-black/70 backdrop-blur-sm"
          style={{ left: 'var(--sidebar-width, 0px)' }}
        >
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-(--color-accent-primary) border-t-transparent" />
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-(--color-accent-primary)" style={{ fontFamily: "'Sora', sans-serif" }}>
              Generating your storyboard
            </p>
            <p className="mt-1 text-xs text-text-muted animate-pulse" style={{ fontFamily: "'Outfit', sans-serif" }}>
              This may take a moment...
            </p>
          </div>
        </div>
      )}

      {/* ============================
          SCENE THEATER PREVIEW
          ============================ */}
      {
        isPreviewOpen && (
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-black animate-[fade-in]">
            {/* Background Layer - Fullscreen Video */}
            <div className="absolute inset-0 z-0">
              <video
                key={activeSceneId}
                autoPlay
                muted
                playsInline
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  if (video.duration && video.duration - video.currentTime <= 2) {
                    setShowChoices(true);
                  } else {
                    setShowChoices(false);
                  }
                }}
                onEnded={(e) => {
                  const video = e.currentTarget;
                  video.currentTime = Math.max(0, video.duration - 2);
                  video.play();
                }}
                className="h-full w-full object-cover opacity-80"
              >
                <source src={bgVideo} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/40" />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-8 top-8 z-220 rounded-full bg-black/40 p-3 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-accent-rose"
            >
              <XIcon className="h-6 w-6" />
            </button>

            {/* Scene Stage - Content Overlays */}
            <div className="relative z-210 flex h-full w-full flex-col justify-end p-12 lg:p-24">

              {/* Choices Layer - Above Subtitles */}
              <div className={`mb-12 flex flex-col items-center gap-6 transition-all duration-1000 ${showChoices ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 pointer-events-none'}`}>
                {activeScene.nextScenes.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-(--color-accent-primary) mb-2">What will you do?</p>
                    <div className="flex flex-wrap justify-center gap-4 max-w-4xl">
                      {scenes.filter(s => activeScene.nextScenes.includes(s.id)).map((choice, idx) => (
                        <button
                          key={choice.id}
                          onClick={() => {
                            setUnlockedIds(prev => Array.from(new Set([...prev, choice.id])));
                            handleSelectScene(choice.id);
                          }}
                          className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 px-8 py-5 transition-all hover:scale-105 hover:border-(--color-accent-primary) hover:bg-black/60 active:scale-95"
                          style={{ animationDelay: `${idx * 150}ms` }}
                        >
                          <div className="absolute inset-0 translate-y-full bg-linear-to-t from-(--color-accent-primary)/10 to-transparent transition-transform group-hover:translate-y-0" />
                          <span className="relative z-10 text-sm font-bold uppercase tracking-widest text-white shadow-sm" style={{ fontFamily: "'Sora', sans-serif" }}>
                            {choice.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {activeScene.nextScenes.length === 0 && (
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="group relative overflow-hidden rounded-xl border border-accent-rose bg-black/40 px-8 py-5 transition-all hover:scale-105 hover:bg-accent-rose/20 active:scale-95"
                  >
                    <span className="relative z-10 text-sm font-bold uppercase tracking-widest text-accent-rose" style={{ fontFamily: "'Sora', sans-serif" }}>
                      End of Chapter
                    </span>
                  </button>
                )}
              </div>

              {/* Subtitle Overlay */}
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-xl md:text-3xl font-bold leading-relaxed text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {activeScene.script}
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* Generation Modal */}
      <AssetGenerationModal
        key={isGenModalOpen ? genType : 'closed'}
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        type={genType}
        onSave={handleSaveAsset}
        initialImage={undefined}
      />

      {/* Provider Selection Modal */}
      <ProviderSelectionModal
        isOpen={isProviderModalOpen}
        onClose={() => { setIsProviderModalOpen(false); setPendingGenerateSceneId(null); }}
        onConfirm={handleConfirmProvider}
      />

    </div >
  );
}
