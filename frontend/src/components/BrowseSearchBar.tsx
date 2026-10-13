import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';

export type SearchMode = 'Catalogue' | 'Members';

interface BrowseSearchBarProps {
  mode: SearchMode;
  search: string;
  onModeChange: (mode: SearchMode) => void;
  onSearchChange: (search: string) => void;
}

export default function BrowseSearchBar({
  mode,
  search,
  onModeChange,
  onSearchChange,
}: BrowseSearchBarProps) {
  const label = mode === 'Members' ? 'Search for members' : 'Search for items';

  return (
    <div
      className="flex min-h-14 overflow-visible rounded-xl border border-[var(--market-border)] bg-[var(--market-page)] transition focus-within:border-[var(--market-primary)] focus-within:ring-4 focus-within:ring-[var(--market-primary)]/10"
      id="browse"
    >
      <Listbox value={mode} onChange={onModeChange}>
        <div className="relative shrink-0">
          <ListboxButton className="flex h-full min-w-28 items-center justify-between gap-3 rounded-l-xl border-r border-[var(--market-border)] px-3 py-3 text-sm font-medium text-[var(--market-ink)] focus:outline-none sm:min-w-36 sm:px-4">
            {mode}
            <span
              aria-hidden="true"
              className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[var(--market-primary)]"
            />
          </ListboxButton>
          <ListboxOptions className="absolute left-0 top-full z-30 mt-2 w-44 rounded-xl border border-[var(--market-border)] bg-white py-1 shadow-xl focus:outline-none">
            {(['Catalogue', 'Members'] as const).map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className="cursor-pointer px-4 py-3 text-gray-700 data-focus:bg-[var(--market-page)] data-selected:font-semibold data-selected:text-[var(--market-primary)]"
              >
                {option}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
      <input
        type="search"
        aria-label={label}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={label}
        className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3 py-3 text-sm text-[var(--market-ink)] placeholder:text-gray-400 focus:outline-none sm:px-4 sm:text-base"
      />
    </div>
  );
}
