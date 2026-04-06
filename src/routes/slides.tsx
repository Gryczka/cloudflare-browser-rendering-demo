import { createFileRoute } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { ProgressBar } from '../slides/components/progress-bar';
import { SectionModal } from '../slides/components/section-modal';
import { SLIDES } from '../slides/slides';
import { useSlideNav } from '../slides/use-slide-nav';

export const Route = createFileRoute('/slides')({ component: SlidesPage });

const EASE = [0.16, 1, 0.3, 1] as const;

function SlidesPage() {
  const { slideIndex, step, next, prev, goTo, exit, total } =
    useSlideNav(SLIDES);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);

  const currentSlide = SLIDES[slideIndex];
  const SlideComponent = currentSlide.component;

  return (
    <div className="fixed inset-0 z-100 h-screen w-screen overflow-hidden">
      {/* Exit button */}
      <button
        onClick={exit}
        className="
          absolute top-4 right-4 z-50 flex size-9 items-center justify-center
          rounded-full border border-cf-border/50 bg-cf-bg-200/60 text-cf-text-subtle
          backdrop-blur-sm transition-colors cursor-pointer
          hover:border-cf-orange hover:text-cf-text
        "
        title="Exit slides (Esc)"
      >
        <X className="size-4" />
      </button>

      {/* Slide content with transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="size-full"
        >
          <SlideComponent step={step} />
        </motion.div>
      </AnimatePresence>

      {/* Progress bar */}
      <ProgressBar
        slideIndex={slideIndex}
        total={total}
        onClickTrack={goTo}
        onPrev={prev}
        onNext={next}
        onGrid={() => setSectionModalOpen(true)}
      />

      {/* Section jump modal */}
      <SectionModal
        open={sectionModalOpen}
        slides={SLIDES}
        currentIndex={slideIndex}
        onSelect={goTo}
        onClose={() => setSectionModalOpen(false)}
      />
    </div>
  );
}
