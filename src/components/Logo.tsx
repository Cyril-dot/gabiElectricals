export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none" aria-label="GabiElectricals home">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="12" fill="#0A5CFF" />
        <path d="M27 8L13 27h9l-3 13 16-21h-10l2+0z" fill="#FFB020" stroke="#FFB020" strokeWidth="1" strokeLinejoin="round" />
        <path d="M27.5 8.5 13.5 27.5h8.6l-3 12.5L35 17.5h-9.6z" fill="#FFB020" />
      </svg>
      <span className={`font-display font-extrabold tracking-tight leading-none ${light ? 'text-white' : 'text-navy dark:text-white'}`}>
        <span className="text-[1.05em]">Gabi</span>
        <span className="text-blue dark:text-gold">Electricals</span>
        <span className={`block text-[0.42em] font-semibold tracking-[0.22em] uppercase mt-0.5 ${light ? 'text-white/70' : 'text-soft'}`}>Premium Power</span>
      </span>
    </span>
  );
}
