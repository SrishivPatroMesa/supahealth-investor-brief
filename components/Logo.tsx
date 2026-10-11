export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B5BF7" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#logo-g)" />
        <path d="M10 20.5c1.4 1.3 3.4 2 5.6 2 3.1 0 5.2-1.5 5.2-3.8 0-2.2-1.6-3.1-4.6-3.7l-1.4-.3c-1.6-.3-2.2-.8-2.2-1.6 0-1 1-1.6 2.6-1.6 1.5 0 2.8.5 3.8 1.3"
          fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="logo-word">SupaHealth</span>
      <span className="logo-product">Investor briefs</span>
    </span>
  );
}
