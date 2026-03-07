import { useState } from 'react';

interface NavbarProps {
  onCreateStory: () => void;
}

export default function Navbar({ onCreateStory }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="glass-strong fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-cyan)]">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-cyan)] opacity-40 blur-lg" />
            </div>
            <span className="text-gradient text-lg font-bold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              StoryVerse
            </span>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Create Story Button */}
            <button
              id="create-story-btn"
              onClick={onCreateStory}
              className="group relative hidden cursor-pointer items-center gap-2 overflow-hidden rounded-[var(--radius-button)] bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent-primary)]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-accent-primary)]/40 sm:inline-flex"
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
              <svg className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="relative z-10">Create Story</span>
            </button>

            {/* Avatar */}
            <button className="group relative h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-cyan)] p-[2px] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-accent-primary)]/30">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[var(--color-bg-secondary)]">
                <span className="text-sm font-semibold text-[var(--color-accent-secondary)]">D</span>
              </div>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors duration-200 hover:bg-white/5 hover:text-[var(--color-text-primary)] md:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`overflow-hidden transition-all duration-300 md:hidden ${isMenuOpen ? 'max-h-64 border-t border-white/5' : 'max-h-0'}`}>
        <div className="space-y-1 px-4 py-3">
          <MobileNavLink active>Dashboard</MobileNavLink>
          <MobileNavLink>Explore</MobileNavLink>
          <MobileNavLink>My Stories</MobileNavLink>
          <MobileNavLink>Community</MobileNavLink>
          <button
            onClick={onCreateStory}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Story
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <a
      href="#"
      className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200
        ${active
          ? 'text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-cyan)]" />
      )}
    </a>
  );
}

function MobileNavLink({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <a
      href="#"
      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200
        ${active
          ? 'bg-white/5 text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {children}
    </a>
  );
}
