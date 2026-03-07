import { useState } from 'react';
import StoryCard from '../components/StoryCard';
import EditStoryModal from '../components/EditStoryModal';
import { BookIcon, PlayIcon, GlobeIcon, StarIcon, PlusIcon, GridIcon, ListIcon } from '../components/Icons';

// Stats definitions
const STATS_CONFIG = [
  {
    label: 'Total Stories',
    value: '12',
    Icon: BookIcon,
    color: 'from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]',
    bgGlow: 'var(--color-accent-primary)',
  },
  {
    label: 'Published',
    value: '8',
    Icon: GlobeIcon,
    color: 'from-[var(--color-accent-emerald)] to-emerald-400',
    bgGlow: 'var(--color-accent-emerald)',
  },
];

interface DashboardProps {
  stories: {
    id: string;
    title: string;
    thumbnail: string;
    author: string;
    plays: number;
    genre: string;
    isPublished: boolean;
  }[];
  setStories: (stories: any[]) => void;
  onCreateStory: () => void;
}

export default function Dashboard({ stories, setStories, onCreateStory }: DashboardProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingStory, setEditingStory] = useState<{ id: string, title: string, thumbnail: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditStory = (id: string) => {
    const story = stories.find(s => s.id === id);
    if (story) {
      setEditingStory({
        id: story.id,
        title: story.title,
        thumbnail: story.thumbnail
      });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveStory = (id: string, newThumbnail: string) => {
    setStories(stories.map(s =>
      s.id === id ? { ...s, thumbnail: newThumbnail } : s
    ));
    setIsEditModalOpen(false);
    setEditingStory(null);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden px-6 pt-20 pb-12">
      <div className="w-full">
        {/* ============================
            HEADER SECTION
            ============================ */}
        <section className="mb-10 animate-[slide-up] opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                Welcome back, <span className="text-gradient">Developer</span> 👋
              </h1>
              <p className="text-[var(--color-text-secondary)]">
                Manage your stories, explore new worlds, and create amazing experiences.
              </p>
            </div>

            {/* Create Story - Mobile */}
            <button
              onClick={onCreateStory}
              className="group inline-flex cursor-pointer items-center gap-2 self-start rounded-[var(--radius-button)] bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/40 sm:hidden"
            >
              <PlusIcon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Create Story
            </button>
          </div>
        </section>

        {/* ============================
            STATS SECTION
            ============================ */}
        <section className="mb-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {STATS_CONFIG.map((stat, index) => (
              <div
                key={stat.label}
                className="glass group relative animate-[card-enter] overflow-hidden rounded-[var(--radius-card)] p-4 opacity-0 transition-all duration-300 hover:scale-[1.02] sm:p-5"
                style={{ animationDelay: `${index * 50 + 100}ms`, animationFillMode: 'forwards' }}
              >
                {/* Background glow */}
                <div
                  className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20"
                  style={{ background: stat.bgGlow }}
                />

                <div className="relative z-10">
                  <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-br ${stat.color} p-2 text-white shadow-lg`}>
                    <stat.Icon />
                  </div>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[var(--color-text-muted)] sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================
            STORIES SECTION
            ============================ */}
        <section>
          {/* Section Header */}
          <div className="mb-6 flex items-center justify-between animate-[fade-in] opacity-0" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                My Stories
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {stories.length} stories created
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white/5 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${viewMode === 'grid'
                    ? 'bg-[var(--color-accent-primary)] text-white shadow-lg'
                    : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'
                    }`}
                >
                  <GridIcon />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-all duration-200 ${viewMode === 'list'
                    ? 'bg-[var(--color-accent-primary)] text-white shadow-lg'
                    : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'
                    }`}
                >
                  <ListIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Story Container */}
          <div className={`grid gap-4 transition-all duration-500 ${viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
            }`}>
            {stories.map((story, index) => (
              <StoryCard
                key={story.id}
                {...story}
                viewMode={viewMode}
                onEdit={handleEditStory}
                onPlay={(id) => console.log('Play story:', id)}
                animationDelay={index * 50 + 400}
              />
            ))}

            {/* Create New Story Card */}
            <button
              id="create-story-card"
              onClick={onCreateStory}
              className={`group relative flex animate-[card-enter] cursor-pointer items-center justify-center rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-border-default)] bg-transparent p-6 opacity-0 transition-all duration-500 hover:border-[var(--color-accent-primary)]/50 hover:bg-[var(--color-bg-card)]/50 ${viewMode === 'grid' ? 'flex-col min-h-[280px]' : 'w-full h-24 flex-row gap-4'
                }`}
              style={{ animationDelay: `${stories.length * 50 + 400}ms`, animationFillMode: 'forwards' }}
            >
              {/* Pulsing glow background */}
              <div className="absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'radial-gradient(circle at center, rgba(200, 164, 90, 0.06) 0%, transparent 70%)' }} />

              <div className={`relative z-10 flex items-center ${viewMode === 'grid' ? 'flex-col gap-4' : 'flex-row gap-4 w-full'}`}>
                {/* Plus icon circle */}
                <div className={`${viewMode === 'grid' ? 'h-16 w-16' : 'h-10 w-10'} flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border-hover)] text-[var(--color-text-muted)] transition-all duration-500 group-hover:border-[var(--color-accent-primary)]/50 group-hover:bg-[var(--color-accent-primary)]/10 group-hover:text-[var(--color-accent-secondary)]`}>
                  <PlusIcon className={`${viewMode === 'grid' ? 'h-8 w-8' : 'h-5 w-5'} transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110`} />
                </div>

                <div className={`${viewMode === 'grid' ? 'text-center' : 'text-left'}`}>
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)] transition-colors duration-300 group-hover:text-[var(--color-accent-secondary)]">
                    Create New Story
                  </p>
                  <p className={`mt-1 text-xs text-[var(--color-text-muted)] ${viewMode === 'grid' ? '' : 'hidden sm:block'}`}>
                    Start building your next adventure
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      <EditStoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        story={editingStory}
        onSave={handleSaveStory}
      />
    </main>
  );
}
