import { useId, useState } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = getCountries().sort((left, right) =>
  (countryNames.of(left) ?? left).localeCompare(countryNames.of(right) ?? right),
);

function flag(country: CountryCode) {
  return String.fromCodePoint(
    ...Array.from(country, (letter) => 127397 + letter.charCodeAt(0)),
  );
}

function splitNumber(value: string) {
  const parsed = parsePhoneNumberFromString(value);
  const country =
    parsed?.country ??
    parsed?.getPossibleCountries()[0] ??
    countries.find((code) =>
      value.startsWith(`+${getCountryCallingCode(code)}`),
    ) ??
    'AL';
  const prefix = `+${getCountryCallingCode(country)}`;
  return {
    country,
    number: value.startsWith(prefix) ? value.slice(prefix.length).trim() : value,
  };
}

export default function PhoneNumberField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [parts, setParts] = useState(() => splitNumber(value));
  const prefix = `+${getCountryCallingCode(parts.country)}`;

  function update(country: CountryCode, number: string) {
    setParts({ country, number });
    onChange(
      number.trim()
        ? number.trim().startsWith('+')
          ? number.trim()
          : `+${getCountryCallingCode(country)} ${number.trim()}`
        : '',
    );
  }

  return (
    <div className="text-sm">
      <label
        htmlFor={id}
        className="block font-medium text-[var(--market-ink)]"
      >
        Phone number
      </label>
      <div className="mt-1.5 flex min-w-0 items-stretch rounded-xl border border-[var(--market-border)] bg-white transition-[border-color,box-shadow] hover:border-[var(--market-primary)]/40 focus-within:border-[var(--market-primary)] focus-within:ring-4 focus-within:ring-[var(--market-primary)]/10">
        <div className="relative my-1 ml-1 flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--market-page)] px-2 text-[var(--market-ink)] transition-colors hover:bg-[var(--market-border)] focus-within:ring-2 focus-within:ring-[var(--market-primary)]/30 has-[:disabled]:opacity-50">
          <span aria-hidden="true" className="text-base leading-none">{flag(parts.country)}</span>
          <span aria-hidden="true" className="whitespace-nowrap text-xs font-medium">({prefix})</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5 shrink-0">
            <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <select
            aria-label="Phone country and dialing code"
            value={parts.country}
            onChange={(event) => {
              const country = countries.find((code) => code === event.target.value);
              if (country) update(country, parts.number);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          >
            {countries.map((country) => (
              <option key={country} value={country}>
                {flag(country)} (+{getCountryCallingCode(country)}) {country}
              </option>
            ))}
          </select>
        </div>
        <input
          id={id}
          type="tel"
          autoComplete="tel-national"
          value={parts.number}
          maxLength={30 - prefix.length - 1}
          placeholder="Phone number"
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            const number = event.target.value;
            if (number.startsWith('+')) {
              const parsed = parsePhoneNumberFromString(number);
              if (parsed?.country || parsed?.getPossibleCountries().length) {
                const split = splitNumber(number);
                update(split.country, split.number);
                return;
              }
            }
            update(parts.country, number);
          }}
          className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3 py-2.5 text-sm text-[var(--market-ink)] placeholder:text-gray-400 focus:outline-none disabled:bg-[var(--market-page)] disabled:text-gray-500"
        />
      </div>
      <p id={`${id}-help`} className="mt-1 text-xs text-gray-500">
        Choose a code or paste a number starting with +.
      </p>
    </div>
  );
}
