import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getCountries } from 'libphonenumber-js';
import PhoneNumberField from '../components/PhoneNumberField';

describe('phone country selector', () => {
  it('keeps the styled selector and number input keyboard accessible', async () => {
    const user = userEvent.setup();
    render(<PhoneNumberField value="" onChange={vi.fn()} />);
    await user.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
    await user.selectOptions(screen.getByRole('combobox'), 'XK');
    expect(screen.getByText('(+383)')).toBeInTheDocument();
    expect(screen.queryByText('(+383) XK', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: '🇽🇰 (+383) XK' })).toBeInTheDocument();
    await user.tab();
    expect(screen.getByLabelText('Phone number')).toHaveFocus();
  });

  it('disables both controls while the profile form is disabled', () => {
    render(
      <fieldset disabled>
        <PhoneNumberField value="" onChange={vi.fn()} />
      </fieldset>,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByLabelText('Phone number')).toBeDisabled();
  });

  it('includes every supported country with flags and calling codes', () => {
    render(<PhoneNumberField value="" onChange={vi.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(getCountries().length);
    expect(screen.getByRole('option', { name: '🇦🇱 (+355) AL' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '🇽🇰 (+383) XK' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '🇺🇸 (+1) US' })).toBeInTheDocument();
  });

  it('loads an existing international number and changes only the prefix', async () => {
    const change = vi.fn();
    render(<PhoneNumberField value="+44 7700 900123" onChange={change} />);
    expect(screen.getByRole('combobox')).toHaveValue('GB');
    expect(screen.getByLabelText('Phone number')).toHaveValue('7700 900123');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'XK');
    expect(change).toHaveBeenLastCalledWith('+383 7700 900123');
    await userEvent.clear(screen.getByLabelText('Phone number'));
    expect(change).toHaveBeenLastCalledWith('');
  });

  it('recognizes a pasted international number', async () => {
    const change = vi.fn();
    const user = userEvent.setup();
    render(<PhoneNumberField value="" onChange={change} />);
    await user.click(screen.getByLabelText('Phone number'));
    await user.paste('+44 7700 900123');
    expect(screen.getByRole('combobox')).toHaveValue('GB');
    expect(screen.getByLabelText('Phone number')).toHaveValue('7700 900123');
    expect(change).toHaveBeenLastCalledWith('+44 7700 900123');
  });

  it('does not save a prefix by itself for an empty phone number', async () => {
    const change = vi.fn();
    render(<PhoneNumberField value="" onChange={change} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'US');
    expect(change).toHaveBeenLastCalledWith('');
    await userEvent.type(screen.getByLabelText('Phone number'), '2025550123');
    expect(change).toHaveBeenLastCalledWith('+1 2025550123');
  });
});
