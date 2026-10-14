export default function VerifiedBadge({ verified }: { verified?: boolean }) {
  if (!verified) return null;

  return (
    <span
      role="img"
      aria-label="Admin-verified profile"
      title="Profile verified by an admin"
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--market-primary)] text-white"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="h-3.5 w-3.5"
      >
        <path
          d="m5 10 3 3 7-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
