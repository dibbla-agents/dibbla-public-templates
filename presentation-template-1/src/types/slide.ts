import type { ComponentType } from 'react';

export type SlideSection =
  | 'intro'
  | 'usecases'
  | 'outro';

export interface SlideProps {
  direction?: number;
}

export interface SlideConfig {
  id: string;
  title: string;
  section: SlideSection;
  component: ComponentType<SlideProps>;
  isDivider?: boolean;
  isPlaceholder?: boolean;
}
