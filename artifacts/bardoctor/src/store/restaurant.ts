// ─── Restaurant profile — persisted to localStorage ───────────────────────────

export interface RestaurantProfile {
  name: string;
  businessType: string;
  country: string;
  city: string;
  seats: number;
  avgCheck: number;
  employees: number;
  openTime: string;
  closeTime: string;
  areas: string[]; // e.g. ['Бар', 'Кухня', 'Кофе', 'Доставка']
}

const KEY = 'bd_restaurant_profile';

export function loadProfile(): RestaurantProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RestaurantProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: RestaurantProfile): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
}

/** Returns up to 2 uppercase initials from a name string. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
