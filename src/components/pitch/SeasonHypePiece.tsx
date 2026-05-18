// SeasonHypePiece — one season section in the pitch page.
// Composite lineup placeholder (5 hero slots), season metadata, slot-fill chips,
// pair-rationale prose block.

import { type SeasonData, SUBSTRATE_ACCENT } from '../../data/pitch/pitchData';
import { HeroPortraitPlaceholder } from './HeroPortraitPlaceholder';
import { SlotFillChipRow } from './SlotFillChipRow';
import { CosmologyPairBlock } from './CosmologyPairBlock';

interface SeasonHypePieceProps {
  season: SeasonData;
}

export function SeasonHypePiece({ season }: SeasonHypePieceProps) {
  const accent = SUBSTRATE_ACCENT[season.accentSubstrate];

  // Resolve hero positions for the composite layout
  const center    = season.heroes.find((h) => h.position === 'center');
  const leftFlank = season.heroes.find((h) => h.position === 'left-flank');
  const rightFlank= season.heroes.find((h) => h.position === 'right-flank');
  const backLeft  = season.heroes.find((h) => h.position === 'back-left');
  const backRight = season.heroes.find((h) => h.position === 'back-right');

  return (
    <section className="max-w-6xl mx-auto px-4 py-10 border-t border-gray-800">
      {/* Season anchor + theme element */}
      <div className="flex flex-wrap items-baseline gap-3 mb-1">
        <h3 className={['text-xl font-semibold', accent.text].join(' ')}>
          {season.anchorName}
        </h3>
        <span className="font-mono uppercase tracking-wide text-[10px] text-gray-500">
          theme: {season.themeElement}
        </span>
      </div>

      {/* Flavor blurb */}
      <p className="text-sm leading-relaxed text-gray-400 mb-6 max-w-prose">
        {season.flavorBlurb}
      </p>

      {/* Composite lineup — CSS grid, portrait ratio boxes */}
      {/* Layout: back row (2 smaller) on top, front row (center large + 2 flanks) below */}
      <div className="mb-6">
        {/* Back row */}
        <div className="grid grid-cols-2 gap-2 mb-2 max-w-md mx-auto md:max-w-none md:grid-cols-4">
          {/* back-left occupies col 1, back-right occupies col 4 on desktop */}
          <div className="opacity-70 scale-95 origin-bottom md:col-start-1">
            {backLeft && (
              backLeft.portraitPath ? (
                <img src={backLeft.portraitPath} alt={backLeft.className} className="w-full rounded object-cover aspect-[3/4]" />
              ) : (
                <HeroPortraitPlaceholder className={backLeft.className} substrate={backLeft.substrate} />
              )
            )}
          </div>
          <div className="opacity-70 scale-95 origin-bottom md:col-start-4">
            {backRight && (
              backRight.portraitPath ? (
                <img src={backRight.portraitPath} alt={backRight.className} className="w-full rounded object-cover aspect-[3/4]" />
              ) : (
                <HeroPortraitPlaceholder className={backRight.className} substrate={backRight.substrate} />
              )
            )}
          </div>
        </div>

        {/* Front row: left-flank / center (larger) / right-flank */}
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto md:max-w-md">
          <div className="opacity-85">
            {leftFlank && (
              leftFlank.portraitPath ? (
                <img src={leftFlank.portraitPath} alt={leftFlank.className} className="w-full rounded object-cover aspect-[3/4]" />
              ) : (
                <HeroPortraitPlaceholder className={leftFlank.className} substrate={leftFlank.substrate} />
              )
            )}
          </div>

          {/* Center hero — slightly larger via negative margin trick */}
          <div className="-mt-4 z-10 relative">
            {center && (
              center.portraitPath ? (
                <img src={center.portraitPath} alt={center.className} className="w-full rounded-lg object-cover aspect-[3/4] ring-1 ring-gray-700" />
              ) : (
                <HeroPortraitPlaceholder className={center.className} substrate={center.substrate} />
              )
            )}
          </div>

          <div className="opacity-85">
            {rightFlank && (
              rightFlank.portraitPath ? (
                <img src={rightFlank.portraitPath} alt={rightFlank.className} className="w-full rounded object-cover aspect-[3/4]" />
              ) : (
                <HeroPortraitPlaceholder className={rightFlank.className} substrate={rightFlank.substrate} />
              )
            )}
          </div>
        </div>
      </div>

      {/* Slot-fill chips */}
      <div className="mb-8">
        <p className="font-mono uppercase tracking-wide text-[10px] text-gray-500 mb-2">
          Cosmological vocabulary
        </p>
        <SlotFillChipRow slotFills={season.slotFills} accentSubstrate={season.accentSubstrate} />
      </div>

      {/* Pair-rationale prose */}
      <CosmologyPairBlock
        pairLabel={season.featuredPairLabel}
        rationale={season.featuredPairRationale}
        accentSubstrate={season.accentSubstrate}
      />
    </section>
  );
}
