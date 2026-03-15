interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt: string;
}

export default function ImagePreviewModal({ isOpen, onClose, imageUrl, alt }: ImagePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* Image container */}
      <div className="relative z-10">
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-110"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Alt text label */}
        {alt && (
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-black/60 px-4 py-2 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80">{alt}</span>
          </div>
        )}
      </div>
    </div>
  );
}
