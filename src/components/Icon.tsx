import { ICON_PATHS, type IconName } from './icon-paths';

export type { IconName };

type Props = {
  name: IconName;
  size?: number;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
};

/** Google Material Symbols (Rounded) icon, rendered as inline SVG. */
export function Icon({ name, size = 20, className = '', filled = false, style }: Props) {
  const paths = ICON_PATHS[name] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={`shrink-0 select-none ${className}`}
      style={{ fontVariationSettings: filled ? "'FILL' 1" : undefined, ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
