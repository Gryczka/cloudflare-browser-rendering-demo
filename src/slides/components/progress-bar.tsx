import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';

export function ProgressBar({
  slideIndex,
  total,
  onPrev,
  onNext,
  onGrid,
  onClickTrack,
}: {
  slideIndex: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onGrid: () => void;
  onClickTrack: (index: number) => void;
}) {
  const progress = total > 1 ? slideIndex / (total - 1) : 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center gap-3 border-t border-cf-border bg-cf-bg-200/90 px-5 backdrop-blur-sm">
      {/* Prev */}
      <button
        type="button"
        onClick={onPrev}
        disabled={slideIndex === 0}
        className="flex size-8 items-center justify-center rounded-lg text-cf-text-muted transition-colors hover:bg-cf-bg-300 hover:text-cf-text disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Previous slide"
      >
        <ChevronLeft className="size-4" />
      </button>

      {/* Next */}
      <button
        type="button"
        onClick={onNext}
        disabled={slideIndex === total - 1}
        className="flex size-8 items-center justify-center rounded-lg text-cf-text-muted transition-colors hover:bg-cf-bg-300 hover:text-cf-text disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Next slide"
      >
        <ChevronRight className="size-4" />
      </button>

      {/* Grid / section modal */}
      <button
        type="button"
        onClick={onGrid}
        className="flex size-8 items-center justify-center rounded-lg text-cf-text-muted transition-colors hover:bg-cf-bg-300 hover:text-cf-text"
        aria-label="Show all slides"
      >
        <LayoutGrid className="size-4" />
      </button>

      {/* Progress track */}
      <button
        type="button"
        className="relative mx-3 flex h-1.5 flex-1 cursor-pointer rounded-full bg-cf-border"
        aria-label="Slide progress"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const fraction = x / rect.width;
          const index = Math.round(fraction * (total - 1));
          onClickTrack(Math.max(0, Math.min(total - 1, index)));
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-cf-orange"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: [0.16, 0.77, 0.36, 0.98] }}
        />

        {/* Tick marks */}
        <div className="absolute inset-0 flex items-center justify-between px-px">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`size-2 rounded-full transition-colors ${
                i <= slideIndex ? 'bg-cf-orange' : 'bg-cf-border'
              } ${i === slideIndex ? 'ring-2 ring-cf-orange/30' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onClickTrack(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </button>

      {/* Counter */}
      <span className="min-w-[4ch] text-right font-mono text-xs text-cf-text-subtle">
        {slideIndex + 1}/{total}
      </span>
    </div>
  );
}
