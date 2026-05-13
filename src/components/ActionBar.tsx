import { useState } from 'react';
import { Button } from './ui/Button';

interface ActionBarProps {
  onReset: () => void;
  onSave: () => void;
  buildUrl: string;
}

export function ActionBar({ onReset, onSave, buildUrl: _buildUrl }: ActionBarProps) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="danger" size="sm" onClick={onReset}>
        Reset
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSave}>
        {saved ? '✓ Saved' : 'Save Build'}
      </Button>
      <div className="relative group">
        <Button variant="dim" size="sm" disabled>
          Share Build ↗
        </Button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-xs text-gray-400 text-center opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 leading-snug">
          URL scheme is ready — sharing backend coming in v1
        </div>
      </div>
    </div>
  );
}
