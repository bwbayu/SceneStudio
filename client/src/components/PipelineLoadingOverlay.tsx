interface PipelineLoadingOverlayProps {
  isVisible: boolean;
  statusText?: string;
}

export default function PipelineLoadingOverlay({
  isVisible,
  statusText = 'Initializing pipeline...',
}: PipelineLoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Card */}
      <div className="glass relative w-full max-w-sm overflow-hidden rounded-2xl border border-border-default bg-bg-card shadow-2xl px-8 py-10 flex flex-col items-center gap-6">

        {/* Accent ribbon top */}
        <div className="absolute left-0 top-0 h-0.5 w-full bg-linear-to-r from-(--color-accent-primary) to-(--color-accent-secondary)" />

        {/* Spinner */}
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-border-default border-t-(--color-accent-primary)" />
          <div className="absolute h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-(--color-accent-secondary)" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
        </div>

        {/* Title */}
        <div className="space-y-1.5 text-center">
          <h2
            className="text-lg font-semibold text-text-primary"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Creating Your Story
          </h2>
          <p
            className="text-sm text-text-muted"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {statusText}
          </p>
        </div>

        {/* Animated progress dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-(--color-accent-primary) opacity-40"
              style={{
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Background glow */}
        <div className="absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-(--color-accent-primary) opacity-[0.04] blur-[80px]" />
        <div className="absolute -bottom-16 -left-16 -z-10 h-48 w-48 rounded-full bg-(--color-accent-secondary) opacity-[0.04] blur-[80px]" />
      </div>
    </div>
  );
}
