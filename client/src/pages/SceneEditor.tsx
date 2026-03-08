import { useState, useRef, useEffect } from 'react';
import {
  TrashIcon,
  MagicIcon,
  ChevronDownIcon,
  EditIcon,
  PlusIcon,
  XIcon,
  LockIcon,
  ListIcon
} from '../components/Icons';
import AssetGenerationModal from '../components/AssetGenerationModal';
import SceneEditModal from '../components/SceneEditModal';

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
  story: any;
  onBack: () => void;
}

export default function SceneEditor({ story, onBack }: SceneEditorProps) {
  const [activeSceneId, setActiveSceneId] = useState<string>('scene-1');
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>(['scene-1']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'actor' | 'theme', id?: string } | null>(null);

  const [actors, setActors] = useState([
    { id: 'a1', img: actor1 },
    { id: 'a2', img: actor2 }
  ]);
  const [theme, setTheme] = useState(themeImg);

  // Auto-hide scrollbar logic
  useEffect(() => {
    let timer: any;
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

  const handleDeleteClick = (type: 'actor' | 'theme', id?: string) => {
    setItemToDelete({ type, id });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'actor' && itemToDelete.id) {
      setActors(prev => prev.filter(a => a.id !== itemToDelete.id));
    } else if (itemToDelete.type === 'theme') {
      setTheme(''); // Or set to a placeholder
    }

    setIsDeleteModalOpen(false);
    setItemToDelete(null);
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
        className={`absolute top-6 z-[60] flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[var(--color-bg-secondary)] text-white backdrop-blur-md transition-all duration-500 hover:scale-[1.15] active:scale-90 shadow-2xl ${isSidebarOpen ? 'lg:left-[430px] left-[calc(85vw-50px)]' : 'left-6'
          }`}
      >
        {isSidebarOpen ? (
          <XIcon className="h-5 w-5 text-[var(--color-accent-rose)]" />
        ) : (
          <ListIcon className="h-5 w-5 text-[var(--color-accent-primary)]" />
        )}
      </button>

      {/* ============================
          LEFT SIDEBAR (ASSET)
          ============================ */}
      <aside className={`absolute inset-y-0 left-0 z-50 w-[480px] max-w-[85vw] flex-shrink-0 border-r border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] flex flex-col h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0 ${isSidebarOpen ? 'lg:w-[480px]' : 'lg:w-0 lg:opacity-0 lg:pointer-events-none'}`}>
        <div className="px-6 py-8 border-b border-[var(--color-border-default)]">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>Asset</h2>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col px-4 py-6 gap-3 scrollbar-thin scrollbar-thumb-[var(--color-border-hover)] scrollbar-track-transparent">

          {/* Actor Section */}
          <section className="rounded-xl border border-[var(--color-border-default)] bg-white/5 overflow-hidden flex flex-col transition-all duration-300">
            <button
              onClick={() => toggleSection('actor')}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Actor</h3>
              <div className={`transition-transform duration-300 ${expandedSections.actor ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDownIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
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
                      <div key={actor.id} className="group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg">
                        <img src={actor.img} alt="Actor" className="h-full w-full object-cover" />
                        <button
                          onClick={() => handleDeleteClick('actor', actor.id)}
                          className="absolute right-1 top-1 rounded bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                        >
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
                </div>
              </div>
            </div>
          </section>

          {/* Theme Section */}
          <section className="rounded-xl border border-[var(--color-border-default)] bg-white/5 overflow-hidden flex flex-col transition-all duration-300">
            <button
              onClick={() => toggleSection('theme')}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Theme</h3>
              <div className={`transition-transform duration-300 ${expandedSections.theme ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDownIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
              </div>
            </button>
            <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.theme ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="min-h-0">
                <div className="p-0 border-t border-white/5">
                  <div
                    onWheel={handleHorizontalWheel}
                    className="flex flex-nowrap overflow-x-auto scrollbar-none hover:scrollbar-thin"
                  >
                    <div className="group relative aspect-video w-full flex-shrink-0 overflow-hidden">
                      {theme ? (
                        <>
                          <img src={theme} alt="Theme" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button
                            onClick={() => handleDeleteClick('theme')}
                            className="absolute right-3 top-3 rounded-full bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 backdrop-blur-md"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5 text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-bold">
                          No Theme Selected
                        </div>
                      )}
                    </div>
                    <div
                      onClick={() => handleOpenGen('theme')}
                      className="group relative aspect-video w-24 flex-shrink-0 cursor-pointer overflow-hidden border-l border-white/5"
                    >
                      <div className="flex h-full w-full items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
                        <PlusIcon className="h-6 w-6 text-white/20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Script Section */}
          <section className={`rounded-xl border border-[var(--color-border-default)] bg-white/5 overflow-hidden flex flex-col transition-all duration-300 ${expandedSections.script ? 'flex-1 min-h-[250px]' : 'flex-none'}`}>
            <button
              onClick={() => toggleSection('script')}
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Script</h3>
              <div className={`transition-transform duration-300 ${expandedSections.script ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDownIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
              </div>
            </button>
            <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${expandedSections.script ? 'grid-rows-[1fr] opacity-100 flex-1 border-t border-white/5' : 'grid-rows-[0fr] opacity-0 invisible'}`}>
              <div className="min-h-0 flex flex-col">
                <div className="flex-1 flex flex-col p-4 pt-0">
                  <div className="mb-4 flex items-center justify-end px-1 gap-2 pt-4">
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
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      {/* Navigation Breadcrumb - Outside Main to prevent scrolling */}
      <div className={`absolute top-6 z-20 transition-all duration-500 ease-in-out pointer-events-none flex items-center ${isSidebarOpen
        ? 'lg:left-[480px] lg:right-0 lg:justify-center left-20 w-auto opacity-0 lg:opacity-100'
        : 'left-20 w-auto justify-start opacity-100'
        }`}>
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={onBack}
            className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)] transition-colors"
          >
            Dashboard
          </button>
          <span className="text-[var(--color-text-muted)]">/</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent-primary)]">{story.title}</span>
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
        className={`relative flex-1 bg-[var(--color-bg-primary)] overflow-auto select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
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
      </main >

      {/* ============================
          SCENE THEATER PREVIEW
          ============================ */}
      {
        isPreviewOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black animate-[fade-in]">
            {/* Background Layer - Fullscreen Video */}
            <div className="absolute inset-0 z-0">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover opacity-80"
              >
                <source src={bgVideo} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute right-8 top-8 z-[220] rounded-full bg-black/40 p-3 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-[var(--color-accent-rose)]"
            >
              <XIcon className="h-6 w-6" />
            </button>

            {/* Scene Stage - Content Overlays */}
            <div className="relative z-[210] flex h-full w-full flex-col justify-end p-12 lg:p-24">

              {/* Choices Layer - Above Subtitles */}
              <div className="mb-12 flex flex-col items-center gap-6 animate-[slide-up]">
                {activeScene.nextScenes.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-accent-primary)] mb-2">What will you do?</p>
                    <div className="flex flex-wrap justify-center gap-4 max-w-4xl">
                      {scenes.filter(s => activeScene.nextScenes.includes(s.id)).map((choice, idx) => (
                        <button
                          key={choice.id}
                          onClick={() => handleSelectScene(choice.id)}
                          className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 px-8 py-5 transition-all hover:scale-105 hover:border-[var(--color-accent-primary)] hover:bg-black/60 active:scale-95"
                          style={{ animationDelay: `${idx * 150}ms` }}
                        >
                          <div className="absolute inset-0 translate-y-full bg-gradient-to-t from-[var(--color-accent-primary)]/10 to-transparent transition-transform group-hover:translate-y-0" />
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
                    className="group relative overflow-hidden rounded-xl border border-[var(--color-accent-rose)] bg-black/40 px-8 py-5 transition-all hover:scale-105 hover:bg-[var(--color-accent-rose)]/20 active:scale-95"
                  >
                    <span className="relative z-10 text-sm font-bold uppercase tracking-widest text-[var(--color-accent-rose)]" style={{ fontFamily: "'Sora', sans-serif" }}>
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

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--color-bg-secondary)] p-8 shadow-2xl animate-[scale-in]">
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20 text-red-500">
                <TrashIcon className="h-8 w-8" />
              </div>
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              Are you sure?
            </h3>
            <p className="mb-8 text-center text-sm text-[var(--color-text-secondary)] leading-relaxed">
              This action cannot be undone. This {itemToDelete?.type} will be permanently removed from your story.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-xl bg-white/5 py-4 text-sm font-bold text-white transition-all hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-red-500 py-4 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
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
