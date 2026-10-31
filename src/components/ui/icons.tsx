const BURGUNDY = "#6B2737";

export function BagIcon({ size = 20, color = BURGUNDY }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 10V6.5a3 3 0 0 1 6 0V10" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function UserIcon({ size = 19, color = BURGUNDY }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" stroke={color} strokeWidth="1.6" />
      <path d="M4.8 20c1.2-3.6 4-5.4 7.2-5.4s6 1.8 7.2 5.4" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" fill="none" aria-hidden="true">
      <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
