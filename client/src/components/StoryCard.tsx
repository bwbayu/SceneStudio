import { useState } from 'react';

interface StoryCardProps {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  plays: number;
  genre: string;
  isPublished: boolean;
  onPlay?: (id: string) => void;
  animationDelay?: number;
  viewMode?: 'grid' | 'list';
}

export default function StoryCard({
  id,
  title,
  thumbnail,
  author,
  plays,
  genre,
  isPublished,
  onPlay,
  animationDelay = 0,
  viewMode = 'grid',
}: StoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPlays = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const isList = viewMode === 'list';

  return (
    <div
      className={`group relative animate-[card-enter] opacity-0 ${isList ? 'w-full' : ''}`}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Container */}
      <div className={`relative overflow-hidden rounded-(--radius-card) border border-border-default bg-bg-card transition-all duration-500 hover:border-border-accent hover:shadow-2xl hover:shadow-(--color-accent-primary)/10 ${isList ? 'flex h-24 items-center' : ''
        }`}>

        {/* Thumbnail Section */}
        <div className={`relative overflow-hidden ${isList ? 'h-full w-40 shrink-0' : 'aspect-16/10 w-full'
          }`}>
          {/* Skeleton loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-bg-secondary">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>
          )}

          <img
            src={thumbnail}
            alt={title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Gradient Overlay (only for grid) */}
          {!isList && <div className="absolute inset-0 bg-linear-to-t from-bg-card via-transparent to-transparent opacity-60" />}

          {/* Published status (on top for list, overlay for grid) */}
          <div className={`absolute left-2 top-2 z-10 ${isList ? 'sm:hidden' : ''}`}>
            <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold backdrop-blur-md ${isPublished
                ? 'bg-accent-emerald/20 text-accent-emerald'
                : 'bg-yellow-500/20 text-yellow-400'
              }`}>
              <span className={`h-1 w-1 rounded-full ${isPublished ? 'bg-accent-emerald' : 'bg-yellow-400'}`} />
              {isPublished ? 'Live' : 'Draft'}
            </span>
          </div>

          {/* Play overlay on hover (Grid only) */}
          {!isList && (
            <div className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'
              }`}>
              <button
                id={`play-story-${id}`}
                onClick={() => onPlay?.(id)}
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all duration-500 hover:scale-110 hover:bg-(--color-accent-primary) ${isHovered ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  }`}
              >
                <svg className="ml-1 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Card Content Section */}
        <div className={`flex grow items-center justify-between gap-4 px-4 ${isList ? 'py-2' : 'pb-4 pt-3'}`}>
          <div className="min-w-0 grow">
            <h3 className={`truncate font-semibold text-text-primary transition-colors duration-200 group-hover:text-(--color-accent-secondary) ${isList ? 'text-base sm:text-lg' : 'mb-2 text-base'
              }`}>
              {title}
            </h3>

            <div className={`flex items-center gap-4 ${isList ? 'mt-1' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-(--color-accent-primary)/30 to-(--color-accent-cyan)/30">
                  <span className="text-[9px] font-bold text-(--color-accent-secondary)">
                    {author.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-text-muted">{author}</span>
              </div>

              {isList && (
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {genre}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Plays count */}
            <div className="flex items-center gap-1.5 text-text-muted">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125(0 0)1-1.667-.985V5.653z" />
              </svg>
              <span className="text-xs font-medium">{formatPlays(plays)}</span>
            </div>

            {/* Status (Desktop List View) */}
            {isList && (
              <div className="hidden min-w-16 sm:block">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPublished
                    ? 'bg-accent-emerald/10 text-accent-emerald'
                    : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            )}

            {/* Actions (List View Play only) */}
            <div className={`flex items-center gap-2 ${isList ? '' : 'hidden'}`}>
              <button
                onClick={() => onPlay?.(id)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-(--color-accent-primary) text-white transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <svg className="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom glow line on hover */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--color-accent-primary) via-(--color-accent-secondary) to-(--color-accent-cyan) transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'
          }`} />
      </div>
    </div>
  );
}
