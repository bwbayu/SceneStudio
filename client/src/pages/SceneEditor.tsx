import { useState, useRef } from 'react';
import {
  TrashIcon,
  MagicIcon,
  ChevronDownIcon,
  EditIcon,
  PlusIcon,
  XIcon,
  LockIcon
} from '../components/Icons';
import AssetGenerationModal from '../components/AssetGenerationModal';
import SceneEditModal from '../components/SceneEditModal';

// Reuse thumbnails for mockup
import actor1 from '../assets/images/img_thumb_1.webp';
import actor2 from '../assets/images/img_thumb_2.webp';
import themeImg from '../assets/images/img_thumb_3.webp';

interface Scene {
  id: string;
  title: string;
  thumbnail: string;
  script: string;
  nextScenes: string[];
}

interface SceneEditorProps {
  story: any;
  onBack: () => void;
}

export default function SceneEditor({ story, onBack }: SceneEditorProps) {
  const [activeSceneId, setActiveSceneId] = useState<string>('scene-1');
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(['scene-1']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);

  const [actors] = useState([
    { id: 'a1', img: actor1 },
    { id: 'a2', img: actor2 }
  ]);
  const [theme] = useState(themeImg);

  const [scenes, setScenes] = useState<Scene[]>([
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

  const handleSaveAsset = (type: string, data: any) => {
    console.log(`Saved ${type} asset:`, data);
  };

  const handleAddManualScript = () => {
    const newId = `scene-${scenes.length + 1}`;
    const newScene: Scene = {
      id: newId,
      title: `Scene ${scenes.length + 1}`,
      thumbnail: `Scene ${scenes.length + 1}\nThumbnail`,
      script: 'Type your manual script here...',
      nextScenes: []
    };
    setScenes(prev => [...prev, newScene]);
    setActiveSceneId(newId);
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setIsEditModalOpen(true);
  };

  const handleUpdateScene = (updatedScene: Scene) => {
    setScenes(prev => prev.map(s => s.id === updatedScene.id ? updatedScene : s));
  };

  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);

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
    // 1. Root is always unlocked
    if (sceneId === 'scene-1') return false;

    // 2. A scene is unlocked if it OR any of its ancestors
    // are in the selected path at an index > 0.
    // This makes the initial choices (2.1/2.2) locked until clicked,
    // and once clicked, the entire chosen branch unlocks.
    const isNodeInChosenBranch = (id: string): boolean => {
      const idx = selectedPathIds.indexOf(id);
      if (idx > 0) return true; // Found in path at index 1, 2, etc.

      const parent = scenes.find(s => s.nextScenes.includes(id));
      if (!parent) return false;
      return isNodeInChosenBranch(parent.id);
    };

    return !isNodeInChosenBranch(sceneId);
  };

  const isPathActive = (fromId: string, toId: string) => {
    const idx = selectedPathIds.indexOf(fromId);
    return idx !== -1 && selectedPathIds[idx + 1] === toId;
  };

  return (
    <div className="relative flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[var(--color-bg-primary)]">

      {/* ============================
          LEFT SIDEBAR (ASSET)
          ============================ */}
      <aside className="w-80 flex-shrink-0 border-r border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] flex flex-col h-full">
        <div className="px-6 py-8 border-b border-[var(--color-border-default)]">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>Asset</h2>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col px-4 py-6 gap-6">

          {/* Actor Section - Horizontal Scroll */}
          <section className="rounded-xl border border-[var(--color-border-default)] bg-white/5 p-4 flex-shrink-0">
            <div className="mb-4 flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Actor</h3>
              <button
                onClick={() => handleOpenGen('actor')}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                <MagicIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 scrollbar-none hover:scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent">
              {actors.map(actor => (
                <div key={actor.id} className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg">
                  <img src={actor.img} alt="Actor" className="h-full w-full object-cover" />
                  <button className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400">
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleOpenGen('actor')}
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 text-[var(--color-text-muted)] transition-all hover:border-[var(--color-accent-primary)]/50 hover:bg-white/5 hover:text-[var(--color-accent-primary)]"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </div>
          </section>

          {/* Theme Section - Horizontal Scroll (if multiple) */}
          <section className="rounded-xl border border-[var(--color-border-default)] bg-white/5 p-4 flex-shrink-0">
            <div className="mb-4 flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Theme</h3>
              <button
                onClick={() => handleOpenGen('theme')}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                <MagicIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 scrollbar-none hover:scrollbar-thin">
              <div className="group relative aspect-video w-full flex-shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-xl">
                <img src={theme} alt="Theme" className="h-full w-full object-cover" />
                <button className="absolute right-2 top-2 rounded bg-black/60 p-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              {/* Added a placeholder for another theme to demonstrate scroll-x if requested */}
              <div
                onClick={() => handleOpenGen('theme')}
                className="group relative aspect-video w-full flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border border-white/10 opacity-30 transition-all hover:opacity-100 hover:border-[var(--color-accent-primary)]/50"
              >
                <div className="flex h-full w-full items-center justify-center bg-black/20">
                  <PlusIcon className="h-8 w-8 text-white/20" />
                </div>
              </div>
            </div>
          </section>

          {/* Script Section - Vertical Scroll */}
          <section className="flex-1 min-h-0 flex flex-col rounded-xl border border-[var(--color-border-default)] bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Script</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleAddManualScript}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleOpenGen('script')}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors"
                >
                  <MagicIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent">
              {scenes.map(scene => (
                <div key={scene.id} className="flex flex-col">
                  <button
                    onClick={() => setActiveSceneId(activeSceneId === scene.id ? '' : scene.id)}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-bold transition-all duration-300 ${activeSceneId === scene.id
                        ? 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-black shadow-lg shadow-[var(--color-accent-primary)]/20'
                        : 'bg-white/5 text-[var(--color-text-primary)] hover:bg-white/10'
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
                      <div className="relative rounded-lg bg-[var(--color-accent-rose)]/10 p-4 border border-[var(--color-accent-rose)]/20">
                        <button
                          onClick={() => handleEditScene(scene)}
                          className="absolute right-2 top-2 text-[var(--color-accent-rose)] hover:scale-110 transition-transform"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <p className="text-xs leading-relaxed text-[var(--color-text-primary)] pr-6" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {scene.script}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* ============================
          MAIN CANVAS (FLOW)
          ============================ */}
      <main
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        className={`relative flex-1 bg-[var(--color-bg-primary)] overflow-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Navigation Breadcrumb */}
        <div className="fixed left-[340px] top-10 z-20 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors"
          >
            Dashboard
          </button>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent-primary)]">{story.title}</span>
        </div>

        {/* Floating Instruction */}
        <div className="fixed bottom-10 right-10 z-20 rounded-full bg-black/60 border border-white/10 px-6 py-3 backdrop-blur-md">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
            <span className="text-[var(--color-accent-primary)]">Mouse Left Click & Drag</span> to Pan Canvas
          </p>
        </div>

        <div className="flex items-center justify-center p-[200px] min-h-[1500px] min-w-[2000px]">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center">

            {/* Level 1: Scene 1 */}
            <SceneNode
              scene={scenes[0]}
              isActive={activeSceneId === scenes[0].id}
              isLocked={isSceneLocked(scenes[0].id)}
              onClick={() => setIsPreviewOpen(true)}
              onSelect={() => handleSelectScene(scenes[0].id)}
              onEdit={() => handleEditScene(scenes[0])}
            />

            {/* Level 1 -> 2 Arrows */}
            <div className="hidden lg:flex flex-col gap-56 py-10">
              <ArrowSvg isActive={isPathActive(scenes[0].id, scenes[1].id)} />
              <ArrowSvg isActive={isPathActive(scenes[0].id, scenes[2].id)} />
            </div>

            {/* Branches Area */}
            <div className="flex flex-col gap-32">

              {/* Branch A (Scene 2.1 & descendants) */}
              <div className="flex items-center gap-16">
                <SceneNode
                  scene={scenes[1]}
                  isActive={activeSceneId === scenes[1].id}
                  isLocked={isSceneLocked(scenes[1].id)}
                  onClick={() => setIsPreviewOpen(true)}
                  onSelect={() => handleSelectScene(scenes[1].id)}
                  onEdit={() => handleEditScene(scenes[1])}
                />

                <div className="hidden lg:flex flex-col gap-24">
                  <ArrowSvg isActive={isPathActive(scenes[1].id, 'scene-3-1')} />
                  <ArrowSvg isActive={isPathActive(scenes[1].id, 'scene-3-2')} />
                </div>

                <div className="flex flex-col gap-8">
                  <SceneNode
                    scene={scenes[3]}
                    isActive={activeSceneId === scenes[3].id}
                    isLocked={isSceneLocked(scenes[3].id)}
                    onClick={() => setIsPreviewOpen(true)}
                    onSelect={() => handleSelectScene(scenes[3].id)}
                    onEdit={() => handleEditScene(scenes[3])}
                  />
                  <SceneNode
                    scene={scenes[4]}
                    isActive={activeSceneId === scenes[4].id}
                    isLocked={isSceneLocked(scenes[4].id)}
                    onClick={() => setIsPreviewOpen(true)}
                    onSelect={() => handleSelectScene(scenes[4].id)}
                    onEdit={() => handleEditScene(scenes[4])}
                  />
                </div>
              </div>

              {/* Branch B (Scene 2.2 & descendants) */}
              <div className="flex items-center gap-16">
                <SceneNode
                  scene={scenes[2]}
                  isActive={activeSceneId === scenes[2].id}
                  isLocked={isSceneLocked(scenes[2].id)}
                  onClick={() => setIsPreviewOpen(true)}
                  onSelect={() => handleSelectScene(scenes[2].id)}
                  onEdit={() => handleEditScene(scenes[2])}
                />

                <div className="hidden lg:flex flex-col gap-24">
                  <ArrowSvg isActive={isPathActive(scenes[2].id, 'scene-3-3')} />
                  <ArrowSvg isActive={isPathActive(scenes[2].id, 'scene-3-4')} />
                </div>

                <div className="flex flex-col gap-8">
                  <SceneNode
                    scene={scenes[5]}
                    isActive={activeSceneId === scenes[5].id}
                    isLocked={isSceneLocked(scenes[5].id)}
                    onClick={() => setIsPreviewOpen(true)}
                    onSelect={() => handleSelectScene(scenes[5].id)}
                    onEdit={() => handleEditScene(scenes[5])}
                  />
                  <SceneNode
                    scene={scenes[6]}
                    isActive={activeSceneId === scenes[6].id}
                    isLocked={isSceneLocked(scenes[6].id)}
                    onClick={() => setIsPreviewOpen(true)}
                    onSelect={() => handleSelectScene(scenes[6].id)}
                    onEdit={() => handleEditScene(scenes[6])}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ============================
          SCENE THEATER PREVIEW
          ============================ */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-[fade-in]">
          {/* Background Layer */}
          <div className="absolute inset-0">
            <img src={theme} alt="Theme" className="h-full w-full object-cover opacity-60 blur-[2px]" />
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsPreviewOpen(false)}
            className="absolute right-8 top-8 z-[110] rounded-full bg-black/40 p-3 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-[var(--color-accent-rose)]"
          >
            <XIcon className="h-6 w-6" />
          </button>

          {/* Scene Stage */}
          <div className="relative z-[105] flex h-full w-full items-center justify-center p-20">
            <div className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <img src={theme} alt="Scene Theme" className="h-full w-full object-cover" />

              {/* Actors in Scene */}
              <div className="absolute inset-0 flex items-end justify-center gap-20 pb-20">
                <img
                  src={actors[1].img}
                  alt="Actor Left"
                  className="h-1/2 w-auto animate-[slide-up] transition-transform hover:scale-105"
                  style={{ animationDelay: '300ms' }}
                />
                <img
                  src={actors[0].img}
                  alt="Actor Right"
                  className="h-1/2 w-auto animate-[slide-up] transition-transform hover:scale-105"
                  style={{ animationDelay: '500ms' }}
                />
              </div>

              {/* Subtitle Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-12 text-center">
                <p className="mx-auto max-w-3xl text-xl font-bold uppercase tracking-wider text-white drop-shadow-lg" style={{ fontFamily: "'Sora', sans-serif" }}>
                  {activeScene.script}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Modal */}
      <AssetGenerationModal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        type={genType}
        onSave={handleSaveAsset}
        initialImage={undefined}
      />

      {/* Edit Scene Modal */}
      <SceneEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        scene={editingScene}
        onSave={handleUpdateScene}
      />
    </div>
  );
}

function SceneNode({ scene, isActive, isLocked, onClick, onSelect, onEdit }: { scene: Scene, isActive: boolean, isLocked: boolean, onClick: () => void, onSelect: () => void, onEdit: () => void }) {
  return (
    <div
      onClick={(e) => {
        onSelect();
      }}
      className={`group relative flex flex-col items-center animate-[card-enter] cursor-pointer ${isLocked ? 'opacity-40 grayscale' : ''}`}
    >
      {/* Locked Overlay Icon */}
      {isLocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm border border-white/20">
            <LockIcon className="h-8 w-8 text-white" />
          </div>
        </div>
      )}

      {/* Selection Glow */}
      <div className={`absolute -inset-4 rounded-2xl blur-xl transition-all duration-500 ${isActive ? 'bg-[var(--color-accent-primary)]/20' : 'bg-transparent'}`} />

      <div
        onClick={onSelect}
        className={`relative w-48 overflow-hidden rounded-xl border p-4 transition-all duration-300 ${isActive
            ? 'border-[var(--color-accent-primary)] bg-[var(--color-bg-card)]'
            : 'border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)]'
          }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute right-2 top-2 z-10 rounded bg-black/40 p-1 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-text-primary)]"
        >
          <EditIcon className="h-3 w-3" />
        </button>

        <div
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="mb-3 flex aspect-[4/3] w-full cursor-pointer items-center justify-center rounded-lg bg-white p-4 text-center transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <span className="text-sm font-black whitespace-pre-line text-black" style={{ fontFamily: "'Sora', sans-serif" }}>
            {scene.thumbnail}
          </span>
        </div>

        <p className={`text-center text-xs font-black uppercase tracking-widest ${isActive ? 'text-[var(--color-accent-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
          {scene.title.toLowerCase()} title
        </p>
      </div>
    </div>
  );
}

function ArrowSvg({ isActive }: { isActive?: boolean }) {
  return (
    <svg className={`h-10 w-24 transition-colors duration-500 ${isActive ? 'text-[var(--color-accent-rose)]' : 'text-[var(--color-border-default)]'}`} viewBox="0 0 96 40" fill="none">
      <path d="M0 20 H90 M80 10 L90 20 L80 30" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
