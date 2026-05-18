// HeroPortraitPlaceholder — Phase 1 placeholder until star-lord's portrait pipeline delivers.
// Substrate-accent colored card, 3:4 portrait ratio, class name + substrate label.
// TODO(drax): replace with <img src={portraitPath} ... /> when Phase 2 portrait swap lands.

import { type Substrate, SUBSTRATE_ACCENT } from '../../data/pitch/pitchData';

interface HeroPortraitPlaceholderProps {
  className: string;
  substrate: Substrate;
  /** 'large' for Hero of Engine spotlight; 'small' for season lineup slots */
  size?: 'large' | 'small';
}

export function HeroPortraitPlaceholder({
  className,
  substrate,
  size = 'small',
}: HeroPortraitPlaceholderProps) {
  const accent = SUBSTRATE_ACCENT[substrate];
  const isLarge = size === 'large';

  return (
    <div
      className={[
        'relative flex flex-col items-center justify-between',
        'rounded-lg border',
        accent.bg,
        accent.border,
        isLarge
          ? 'w-full max-w-[280px] aspect-[3/4]'
          : 'w-full aspect-[3/4]',
      ].join(' ')}
      role="img"
      aria-label={`Portrait placeholder for ${className}`}
    >
      {/* Substrate tint overlay */}
      <div className="absolute inset-0 rounded-lg opacity-20 bg-gradient-to-b from-transparent to-black pointer-events-none" />

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3 text-center z-10">
        {/* Substrate icon glyph */}
        <span
          className={[
            'font-mono text-2xl leading-none',
            accent.text,
            'opacity-60',
          ].join(' ')}
          aria-hidden="true"
        >
          {SUBSTRATE_GLYPH[substrate]}
        </span>

        <p
          className={[
            'font-mono tracking-wide leading-snug text-gray-200',
            isLarge ? 'text-base' : 'text-[10px]',
          ].join(' ')}
        >
          {className}
        </p>
      </div>

      {/* Footer label */}
      <div className="w-full border-t border-gray-800/60 px-2 py-1.5 z-10">
        <p className="font-mono uppercase tracking-wide text-[9px] text-gray-600 text-center">
          portrait generating...
        </p>
      </div>
    </div>
  );
}

// Simple ASCII/unicode glyphs as substrate markers — no external icon dep needed here
const SUBSTRATE_GLYPH: Record<Substrate, string> = {
  fire:      '◈',
  water:     '◉',
  earth:     '◆',
  wind:      '◇',
  lightning: '◊',
  holy:      '○',
  shadow:    '●',
  physical:  '■',
};
