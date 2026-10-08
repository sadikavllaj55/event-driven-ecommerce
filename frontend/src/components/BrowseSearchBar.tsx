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
      className="mb-4 flex rounded-md bg-gray-100 focus-within:ring-2 focus-within:ring-teal-500"
      id="browse"
    >
      <Listbox value={mode} onChange={onModeChange}>
        <div className="relative shrink-0">
          <ListboxButton className="flex h-full min-w-28 items-center justify-between gap-3 rounded-l-md border-r border-gray-300 px-3 py-3 text-sm text-gray-700 focus:outline-none sm:min-w-36 sm:px-4 sm:text-base">
            {mode}
            <span
              aria-hidden="true"
              className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-gray-500"
            />
          </ListboxButton>
          <ListboxOptions className="absolute left-0 top-full z-30 mt-2 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg focus:outline-none">
            {(['Catalogue', 'Members'] as const).map((option) => (
              <ListboxOption
                key={option}
                value={option}
                className="cursor-pointer px-4 py-3 text-gray-700 data-focus:bg-gray-100 data-selected:font-semibold data-selected:text-teal-700"
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
        className="min-w-0 flex-1 rounded-r-md bg-transparent px-3 py-3 text-gray-900 focus:outline-none sm:px-4"
      />
    </div>
  );
}
