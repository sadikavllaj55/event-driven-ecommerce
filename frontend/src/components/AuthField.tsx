import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  help?: string;
}

export const authInputClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-[var(--market-border)] bg-white px-3.5 py-2.5 text-sm font-normal text-[var(--market-ink)] placeholder:text-gray-400 transition focus:border-[var(--market-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--market-primary)]/10 disabled:opacity-60';

export default function AuthField({ label, help, className = '', ...props }: Props) {
  const id = useId();
  return (
    <label className="block text-sm font-medium text-[var(--market-ink)]">
      {label}
      <input
        required
        aria-label={label}
        aria-describedby={help ? `${id}-help` : undefined}
        {...props}
        className={`${authInputClass} ${className}`}
      />
      {help && (
        <span id={`${id}-help`} className="mt-1.5 block text-xs font-normal leading-5 text-gray-500">
          {help}
        </span>
      )}
    </label>
  );
}
