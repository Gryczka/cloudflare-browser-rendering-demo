import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SlideDefinition } from '../types';

export function SectionModal({
  open,
  slides,
  currentIndex,
  onSelect,
  onClose,
}: {
  open: boolean;
  slides: SlideDefinition[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="section-modal-backdrop"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-cf-bg-100/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal content */}
          <motion.div
            className="relative z-10 w-full max-w-4xl rounded-2xl border border-cf-border bg-cf-bg-200 p-8 shadow-card"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 0.77, 0.36, 0.98] }}
          >
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-cf-text">All Slides</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-cf-text-muted transition-colors hover:bg-cf-bg-300 hover:text-cf-text"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 gap-4">
              {slides.map((slide, index) => {
                const isCurrent = index === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => {
                      onSelect(index);
                      onClose();
                    }}
                    className={`group flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
                      isCurrent
                        ? 'border-cf-orange bg-cf-orange-light shadow-focus'
                        : 'border-cf-border bg-cf-bg-100 hover:border-cf-orange/50 hover:shadow-card'
                    }`}
                  >
                    {/* Slide number */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex size-6 items-center justify-center rounded-md font-mono text-xs font-bold ${
                          isCurrent
                            ? 'bg-cf-orange text-white'
                            : 'bg-cf-bg-300 text-cf-text-subtle group-hover:text-cf-text-muted'
                        }`}
                      >
                        {index + 1}
                      </span>
                      {isCurrent && (
                        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-cf-orange">
                          Current
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <span
                      className={`text-sm font-medium leading-snug ${
                        isCurrent
                          ? 'text-cf-orange'
                          : 'text-cf-text group-hover:text-cf-orange'
                      }`}
                    >
                      {slide.title}
                    </span>

                    {/* Steps indicator */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: slide.steps }, (_, s) => (
                        <div
                          key={s}
                          className={`h-0.5 flex-1 rounded-full ${
                            isCurrent ? 'bg-cf-orange/40' : 'bg-cf-border'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <p className="mt-5 text-center text-xs text-cf-text-subtle">
              Click a slide to jump to it &middot; Press{' '}
              <kbd className="rounded border border-cf-border bg-cf-bg-300 px-1.5 py-0.5 font-mono text-[10px]">
                Esc
              </kbd>{' '}
              to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
