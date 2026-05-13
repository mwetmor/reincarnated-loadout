import { Card } from '../ui/Card';

export function SpiritGuide() {
  return (
    <Card className="border-dashed border-gray-700">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-dashed border-gray-600 bg-gray-800 flex items-center justify-center text-gray-600 text-xl flex-shrink-0">
          ◈
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500 font-semibold">Spirit Guide</p>
          <p className="text-xs text-gray-700 font-mono mt-0.5">
            Companion placement TBD — v1
          </p>
        </div>
      </div>
    </Card>
  );
}
