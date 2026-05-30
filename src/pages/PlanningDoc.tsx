interface PlanningDocProps {
  src: string;
  title: string;
}

export function PlanningDoc({ src, title }: PlanningDocProps) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full border-0"
      style={{
        // Fill from below the sticky Nav (48px = h-12) to bottom of viewport
        height: 'calc(100vh - 48px)',
        display: 'block',
      }}
    />
  );
}
