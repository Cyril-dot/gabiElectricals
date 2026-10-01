import type { IconName } from './Icon';

/** Maps seed category `icon` keys to Google Material Symbols. */
export const CATEGORY_ICONS: Record<string, IconName> = {
  cable: 'cable',
  socket: 'outlet',
  breaker: 'electrical_services',
  bulb: 'lightbulb',
  solar: 'solar_power',
  battery: 'battery_charging_full',
  gen: 'power',
  tool: 'handyman',
  fan: 'ac_unit',
  plug: 'bolt',
  cam: 'videocam',
  wifi: 'wifi',
  meter: 'speed',
};

export function categoryIcon(key: string | null | undefined): IconName {
  return (key && CATEGORY_ICONS[key]) || 'category';
}
