import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductPrice from './ProductPrice';

describe('ProductPrice', () => {
  it('shows the sale price beside the original price with a reduction badge', () => {
    render(<ProductPrice price="60.00" originalPrice="80.00" />);

    expect(screen.getByText('€60.00')).toBeInTheDocument();
    expect(screen.getByText('€80.00')).toHaveClass(
      'line-through',
      'text-red-600',
    );
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  it('shows only the current price when there is no valid discount', () => {
    const { rerender } = render(<ProductPrice price="60.00" />);
    expect(screen.getByText('€60.00')).toBeInTheDocument();
    expect(screen.queryByText('€80.00')).not.toBeInTheDocument();

    rerender(<ProductPrice price="60.00" originalPrice="55.00" />);
    expect(screen.getByText('€60.00')).toBeInTheDocument();
    expect(screen.queryByText('€55.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
