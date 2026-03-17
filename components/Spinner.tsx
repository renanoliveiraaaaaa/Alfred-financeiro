'use client'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export default function Spinner({ size = 'md', className = '' }: Props) {
  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-manor-800" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-500 animate-[spin_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite]" />
      <div className="absolute inset-[3px] rounded-full border-2 border-transparent border-t-gold-400/40 animate-[spin_1.8s_cubic-bezier(0.5,0,0.5,1)_infinite_reverse]" />
    </div>
  )
}
