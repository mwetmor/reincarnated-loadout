import type { HTMLAttributes } from 'react';
import { ELEMENT_COLORS } from '../../data/constants';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  element?: string;
  size?: 'xs' | 'sm';
}

export function Tag({ element, size = 'sm', className = '', children, ...props }: TagProps) {
  const colors = element ? (ELEMENT_COLORS[element] ?? ELEMENT_COLORS['physical']) : null;

  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`
        inline-flex items-center rounded border font-mono font-medium uppercase tracking-wide
        ${sizeClass}
        ${colors ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-gray-800 text-gray-400 border-gray-700'}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  );
}
