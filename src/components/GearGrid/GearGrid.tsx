import { Card } from '../ui/Card';

const SLOT_LABELS = [
  'Head', 'Chest', 'Hands', 'Legs', 'Feet',
  'Main', 'Off', 'Neck', 'Ring 1', 'Ring 2',
];

export function GearGrid() {
  return (
    <Card>
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-3">
        Gear Slots
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {SLOT_LABELS.map((label) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 p-2 rounded-md border border-dashed border-gray-700 bg-gray-800/40 group"
          >
            <div className="w-8 h-8 rounded border border-gray-700 bg-gray-900 flex items-center justify-center text-gray-700 text-lg group-hover:border-gray-600">
              ◻
            </div>
            <span className="text-[10px] text-gray-600 font-mono text-center leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-700 font-mono text-center mt-3">
        Gear wiring — v1
      </p>
    </Card>
  );
}
