// SlotFillChipRow — row of cosmological slot-fill chips.
// Rendered as mono-label chips with substrate accent border.

import { type Substrate, SUBSTRATE_ACCENT } from '../../data/pitch/pitchData';

interface SlotFillChipRowProps {
  slotFills: string[];
  accentSubstrate: Substrate;
}

export function SlotFillChipRow({ slotFills, accentSubstrate }: SlotFillChipRowProps) {
  const accent = SUBSTRATE_ACCENT[accentSubstrate];

  return (
    <div className="flex flex-wrap gap-1.5">
      {slotFills.map((fill) => (
        <span
          key={fill}
          className={[
            'font-mono uppercase tracking-wide text-[10px] px-2 py-1',
            'rounded border',
            accent.text,
            accent.bg,
            accent.border,
          ].join(' ')}
        >
          {fill}
        </span>
      ))}
    </div>
  );
}
