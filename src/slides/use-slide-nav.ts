import { useState, useEffect, useCallback, useRef } from 'react';
import type { SlideDefinition } from './types';

export function useSlideNav(slides: SlideDefinition[]) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [step, setStep] = useState(0);
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // Sync initial state from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slideParam = params.get('slide');
    if (slideParam !== null) {
      const parsed = parseInt(slideParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < slidesRef.current.length) {
        setSlideIndex(parsed);
        setStep(0);
      }
    }
  }, []);

  // Sync URL when slideIndex changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('mode', 'slides');
    params.set('slide', String(slideIndex));
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, [slideIndex]);

  const next = useCallback(() => {
    const current = slidesRef.current[slideIndex];
    if (!current) return;

    if (step < current.steps - 1) {
      setStep((s) => s + 1);
    } else if (slideIndex < slidesRef.current.length - 1) {
      setSlideIndex((i) => i + 1);
      setStep(0);
    }
  }, [slideIndex, step]);

  const prev = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else if (slideIndex > 0) {
      const prevSlide = slidesRef.current[slideIndex - 1];
      setSlideIndex((i) => i - 1);
      setStep(prevSlide ? prevSlide.steps - 1 : 0);
    }
  }, [slideIndex, step]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < slidesRef.current.length) {
        setSlideIndex(index);
        setStep(0);
      }
    },
    [],
  );

  const exit = useCallback(() => {
    window.history.replaceState(null, '', '/');
    // Dispatch popstate so TanStack Router picks up the change
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'Escape':
          e.preventDefault();
          exit();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, prev, exit]);

  return {
    slideIndex,
    step,
    next,
    prev,
    goTo,
    exit,
    total: slides.length,
    currentSlide: slides[slideIndex],
  };
}
