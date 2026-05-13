interface ClassIconProps {
  classId: string;
  size?: number;
  className?: string;
}

export function ClassIcon({ classId, size = 32, className = '' }: ClassIconProps) {
  const src = `/icons/${classId}.svg`;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`flex-shrink-0 opacity-80 ${className}`}
      style={{ color: 'white', filter: 'brightness(0) invert(1)' }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

export function SeasonIcon({ seasonKey, size = 24, className = '' }: { seasonKey: string; size?: number; className?: string }) {
  const iconMap: Record<string, string> = {
    'season_002328': 'season-yomi',
    'sample-season': 'season-yomi',
  };
  const iconName = iconMap[seasonKey];
  if (!iconName) return null;
  return (
    <img
      src={`/icons/${iconName}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`flex-shrink-0 opacity-60 ${className}`}
      style={{ filter: 'brightness(0) invert(1)' }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}
