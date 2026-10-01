export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none" aria-label="GabiElectricals home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/logo-mark.webp"
        alt=""
        width={size}
        height={size}
        className="rounded-[28%] shadow-pop transition-transform duration-300 hover:rotate-6 hover:scale-105"
      />
      <span className={`font-display font-bold tracking-tight leading-none ${light ? 'text-white' : 'text-navy dark:text-white'}`}>
        <span className="text-[1.08em]">Gabi<span className="text-volt">Electricals</span></span>
        <span className={`block text-[0.42em] font-semibold tracking-[0.24em] uppercase mt-1 ${light ? 'text-white/60' : 'text-soft'}`}>Premium Power</span>
      </span>
    </span>
  );
}
