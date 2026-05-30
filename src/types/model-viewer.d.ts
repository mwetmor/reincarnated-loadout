// TypeScript declaration for Google's <model-viewer> web component.
// Loaded via <script> tag in index.html; consumed as a custom React element.
// Reference: https://modelviewer.dev/

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type ModelViewerProps = DetailedHTMLProps<
  HTMLAttributes<HTMLElement> & {
    src?: string;
    alt?: string;
    poster?: string;
    'auto-rotate'?: boolean | string;
    'auto-rotate-delay'?: number | string;
    'camera-controls'?: boolean | string;
    'disable-zoom'?: boolean | string;
    'shadow-intensity'?: number | string;
    'environment-image'?: string;
    exposure?: number | string;
    'rotation-per-second'?: string;
    ar?: boolean | string;
    'ar-modes'?: string;
    loading?: 'auto' | 'lazy' | 'eager';
    reveal?: 'auto' | 'interaction' | 'manual';
    animation?: string;
    autoplay?: boolean | string;
  },
  HTMLElement
>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerProps;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerProps;
    }
  }
}
