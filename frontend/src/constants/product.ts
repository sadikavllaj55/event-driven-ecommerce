// Shared product constants — single source of truth

export const PRODUCTS_PER_PAGE = 12;
export const MAX_PRODUCT_IMAGES = 7;

// Condition values + display labels
export const CONDITIONS = [
  { value: 'new_with_tags', label: 'New with tags', icon: '\u{1F3F7}\uFE0F' },
  { value: 'new_without_tags', label: 'New without tags', icon: '\u2728' },
  { value: 'very_good', label: 'Very good', icon: '\u2B50' },
  { value: 'good', label: 'Good', icon: '\u{1F44D}' },
  { value: 'satisfactory', label: 'Satisfactory', icon: '\u{1F44C}' },
] as const;

// Quick lookup: value → label (e.g. conditionLabel('very_good') → 'Very good')
export const CONDITION_LABELS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.value, c.label]),
);

// Color-coded badge styles per condition
export const CONDITION_COLORS: Record<string, string> = {
  new_with_tags: 'bg-green-100 text-green-700',
  new_without_tags: 'bg-emerald-100 text-emerald-700',
  very_good: 'bg-teal-100 text-teal-700',
  good: 'bg-blue-100 text-blue-700',
  satisfactory: 'bg-gray-100 text-gray-600',
};

// Gender/department values + labels
export const GENDERS = [
  { value: 'women', label: 'Women', icon: '\u{1F469}' },
  { value: 'men', label: 'Men', icon: '\u{1F468}' },
  { value: 'unisex', label: 'Unisex', icon: '\u{1F465}' },
  { value: 'kids', label: 'Kids', icon: '\u{1F9D2}' },
] as const;
