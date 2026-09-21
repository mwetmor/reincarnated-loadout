import { useEffect, useState } from 'react';

/**
 * /play — character select for the playable cliffside scene.
 *
 * Architecture (knight-rider amendment 2026-09-21, superseding the earlier
 * runtime-toggle lean): the character is chosen BEFORE the Godot engine boots,
 * so exactly one character's assets are ever downloaded. Three .pck files sit
 * against ONE shared engine wasm at /playtest/cliffside/; this page picks which
 * pack by navigating to ?c=<id>. There is no runtime character swap inside the
 * scene, and therefore no player-node teardown, camera re-parenting, or VFX
 * lifecycle across a swap — that machinery is simply not written.
 *
 * Selecting navigates the WHOLE PAGE rather than mounting an iframe. Godot's
 * canvas wants keyboard focus, and an iframe makes focus a per-browser coin
 * flip; a top-level navigation makes WASD work the way it does natively. The
 * way back is a persistent "Change character" chip injected into the game
 * shell (see assemble_trio.py in the burst repo), which links here.
 *
 * localStorage key: "reincarnated.play.character" — last character chosen,
 * one of "warlord" | "keeper" | "necro". Per-viewer convenience only; nothing
 * depends on it and a read failure is non-fatal.
 */

const STORAGE_KEY = 'reincarnated.play.character';

type CharacterId = 'warlord' | 'keeper' | 'necro';

interface Character {
  id: CharacterId;
  name: string;
  style: string;
  blurb: string;
  /** Transfer size of this character's pack, compressed, in MB. */
  packMb: number;
  directions: string;
  moves: string;
  /** Honest caveats. These are the reason the select screen exists. */
  caveats: string[];
  accent: string;
}

/**
 * Figures are all exported at a 151px figure height, so the portraits are cut
 * from each character's own idle_S frame at one common scale — the cards show
 * them at true relative size rather than each filling its card.
 */
const CHARACTERS: Character[] = [
  {
    id: 'warlord',
    name: 'Warlord',
    style: 'Pixel art',
    blurb: 'Armoured, mace and shield. The only one who can swing at anything.',
    packMb: 33,
    directions: 'All 8 directions',
    moves: 'Idle · walk · run · jump · cast · attack',
    caveats: [],
    accent: 'amber',
  },
  {
    id: 'keeper',
    name: 'Keeper',
    style: 'Painted',
    blurb: 'Staff and satchel, lighter on her feet. Casts, but does not fight.',
    packMb: 29,
    directions: 'All 8 directions',
    moves: 'Idle · walk · run · jump · cast',
    caveats: ['No attack — F does nothing'],
    accent: 'sky',
  },
  {
    id: 'necro',
    name: 'Necromancer',
    style: 'Painted',
    blurb: 'Bone-plate and a scythe. The most detailed of the three, and the least finished.',
    packMb: 28,
    directions: '5 of 8 directions',
    moves: 'Idle · walk · run · jump · cast',
    caveats: [
      'No attack — F does nothing',
      'North, north-east and north-west were never drawn. Walking away from the camera, he keeps facing sideways.',
    ],
    accent: 'violet',
  },
];

/** Static classes only — dynamic `bg-${accent}` would be purged in production. */
const ACCENT: Record<string, { ring: string; chip: string; button: string }> = {
  amber: {
    ring: 'hover:border-amber-700/70',
    chip: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    button: 'bg-amber-600 hover:bg-amber-500 text-amber-950',
  },
  sky: {
    ring: 'hover:border-sky-700/70',
    chip: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
    button: 'bg-sky-600 hover:bg-sky-500 text-sky-950',
  },
  violet: {
    ring: 'hover:border-violet-700/70',
    chip: 'bg-violet-950/60 text-violet-300 border-violet-800/60',
    button: 'bg-violet-600 hover:bg-violet-500 text-violet-950',
  },
};

/** The engine wasm, shared by all three packs and cached after the first load. */
const ENGINE_MB = 9;

function readLastChoice(): CharacterId | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return CHARACTERS.some((c) => c.id === raw) ? (raw as CharacterId) : null;
  } catch {
    // Private windows and blocked site data throw on access. Non-fatal.
    return null;
  }
}

export function Play() {
  const [last, setLast] = useState<CharacterId | null>(null);

  useEffect(() => {
    setLast(readLastChoice());
  }, []);

  function choose(id: CharacterId) {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore — the choice is carried in the URL regardless.
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-100">
          Cliffside
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
          A playable slice of the painted cliffside. Pick who you want to walk
          around as — the three are the same scene with a different character in
          it, so this is the place to compare how they move.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHARACTERS.map((character) => {
          const accent = ACCENT[character.accent];
          return (
            <article
              key={character.id}
              className={`flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 transition-colors ${accent.ring}`}
            >
              <div className="relative flex h-56 items-end justify-center overflow-hidden rounded-t-xl bg-gradient-to-b from-gray-800/40 to-gray-900/10">
                <img
                  src={`/characters/${character.id}.png`}
                  alt={`${character.name}, standing`}
                  width={320}
                  height={320}
                  loading="eager"
                  className="h-full w-auto object-contain object-bottom"
                  style={{ imageRendering: character.id === 'warlord' ? 'pixelated' : 'auto' }}
                />
                {last === character.id && (
                  <span className="absolute right-2 top-2 rounded-full border border-gray-700 bg-gray-950/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    Last played
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-100">{character.name}</h2>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${accent.chip}`}
                    >
                      {character.style}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
                    {character.blurb}
                  </p>
                </div>

                <dl className="space-y-1 text-xs text-gray-500">
                  <div className="flex gap-2">
                    <dt className="w-20 flex-shrink-0 text-gray-600">Facing</dt>
                    <dd className={character.caveats.length > 1 ? 'text-amber-500/90' : ''}>
                      {character.directions}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 flex-shrink-0 text-gray-600">Moves</dt>
                    <dd>{character.moves}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 flex-shrink-0 text-gray-600">Download</dt>
                    <dd>
                      ~{character.packMb + ENGINE_MB} MB
                      <span className="text-gray-600"> first time, ~{character.packMb} MB after</span>
                    </dd>
                  </div>
                </dl>

                {character.caveats.length > 0 && (
                  <ul className="space-y-1.5 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5">
                    {character.caveats.map((caveat) => (
                      <li key={caveat} className="flex gap-2 text-xs leading-relaxed text-amber-200/70">
                        <span aria-hidden="true" className="text-amber-500/70">
                          !
                        </span>
                        <span>{caveat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <a
                  href={`/playtest/cliffside/?c=${character.id}`}
                  onClick={() => choose(character.id)}
                  className={`mt-auto flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors ${accent.button}`}
                >
                  Play as {character.name}
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            On a computer
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-gray-400">
            <li>
              <Key>WASD</Key> or arrows move, <Key>Shift</Key> runs
            </li>
            <li>
              <Key>Space</Key> jumps, <Key>E</Key> or left click casts
            </li>
            <li>
              <Key>F</Key> attacks — <span className="text-gray-500">Warlord only</span>
            </li>
            <li>
              <Key>Tab</Key> switches to the next spell effect
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            On a phone
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-gray-400">
            <li>Hold it sideways. Left thumb anywhere on the left half moves; push far to run.</li>
            <li>
              <strong className="text-gray-300">CAST</strong>,{' '}
              <strong className="text-gray-300">JUMP</strong> and{' '}
              <strong className="text-gray-300">VFX</strong> buttons sit on the right.
            </li>
            <li className="text-gray-500">
              It is a large download — Wi-Fi is much happier than cellular.
            </li>
          </ul>
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-gray-600">
        Once you are in, a <span className="text-gray-500">Change character</span> button sits in
        the top-left corner and brings you back here. The engine is shared between all three, so
        swapping only re-downloads that character.
      </p>

      <footer className="mt-8 border-t border-gray-800 pt-4 text-[10px] text-gray-700">
        Built with the{' '}
        <a
          href="https://godotengine.org/license"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 underline underline-offset-2 hover:text-gray-400"
        >
          Godot Engine
        </a>{' '}
        (MIT). Early build — rough edges expected.
      </footer>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 font-mono text-[11px] text-gray-300">
      {children}
    </kbd>
  );
}
