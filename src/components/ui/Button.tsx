import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'dim';
  size?: 'sm' | 'md';
}

const variantClasses = {
  primary: 'bg-violet-600 hover:bg-violet-500 text-white border-transparent',
  ghost:   'bg-transparent hover:bg-gray-800 text-gray-300 border-gray-700',
  danger:  'bg-transparent hover:bg-red-950 text-red-400 border-red-800',
  dim:     'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed',
};

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs min-h-[36px]',
  md: 'px-4 py-2 text-sm min-h-[44px]',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center gap-1.5 rounded border font-medium
        transition-colors duration-100 focus:outline-none focus-visible:ring-2
        focus-visible:ring-violet-500 touch-manipulation
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${props.disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
