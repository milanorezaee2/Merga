export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 6.5c-3.2 3.8-4.8 6.9-4.8 9.4 0 3.3 2.1 5.4 4.8 5.4s4.8-2.1 4.8-5.4c0-2.5-1.6-5.6-4.8-9.4Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M16 21.3v4.6M11 26h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="15.6" r="1.6" fill="currentColor" />
    </svg>
  );
}
