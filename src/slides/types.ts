import type { ComponentType } from 'react';

export interface SlideDefinition {
  id: string;
  title: string;
  component: ComponentType<SlideProperties>;
  steps: number;
}

export interface SlideProperties {
  step: number;
}
