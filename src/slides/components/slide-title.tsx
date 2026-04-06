import { Reveal } from './reveal';

export function SlideTitle({ number, title, subtitle, step }: { number: string; title: string; subtitle: string; step: number }) {
  return (
    <Reveal visible={step >= 0} direction="left" scale={0.98}>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-5">
          <span className="font-mono text-5xl font-bold text-cf-orange/30">{number}</span>
          <h2 className="font-sans text-5xl font-semibold tracking-tight text-cf-text">{title}</h2>
        </div>
        <p className="ml-[calc(3ch+1.25rem)] text-xl text-cf-text-muted">{subtitle}</p>
      </div>
    </Reveal>
  );
}
