import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { profileApi } from '../api/profile';
import { getErrorMessage } from '../utils/errors';
import type { AccountProfile, ProfileUpdate } from '../types';
import PhoneNumberField from './PhoneNumberField';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[var(--market-border)] bg-white px-3 py-2.5 text-sm text-[var(--market-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--market-primary)]/10 disabled:bg-[var(--market-page)] disabled:text-gray-500';

interface Props {
  profile: AccountProfile;
  onSaved: (profile: AccountProfile) => void;
  onCancel: () => void;
  uploading: boolean;
}

export default function ProfileEditor({ profile, onSaved, onCancel, uploading }: Props) {
  const [values, setValues] = useState<ProfileUpdate>({
    name: profile.name, username: profile.username, phone: profile.phone,
    location: profile.location, bio: profile.bio,
  });
  const [initialValues] = useState(values);
  const isDirty = (Object.keys(values) as (keyof ProfileUpdate)[]).some(
    (key) => values[key] !== initialValues[key],
  );
  const save = useMutation({
    mutationFn: () => profileApi.update(values),
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Profile saved');
    },
  });

  return (
    <form className="mt-6" onSubmit={(event) => {
      event.preventDefault();
      if (isDirty && !save.isPending && !uploading) save.mutate();
    }}>
      <fieldset disabled={save.isPending || uploading} className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-[var(--market-ink)]">
          Full name
          <input className={inputClass} autoComplete="name" required maxLength={100} value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-[var(--market-ink)]">
          Username
          <input className={inputClass} autoComplete="username" maxLength={30} pattern="[a-zA-Z0-9_]{3,30}" value={values.username} onChange={(event) => setValues({ ...values, username: event.target.value })} />
          <span className="mt-1 block text-xs font-normal text-gray-500">3-30 letters, digits or underscores. Must be unique.</span>
        </label>
        <label className="text-sm font-medium text-[var(--market-ink)]">
          Email
          <input className={inputClass} type="email" value={profile.email} disabled />
          <span className="mt-1 block text-xs font-normal text-gray-500">Your verified login email cannot be changed here.</span>
        </label>
        <PhoneNumberField value={values.phone} onChange={(phone) => setValues({ ...values, phone })} />
        <label className="text-sm font-medium text-[var(--market-ink)] sm:col-span-2">
          Location
          <input className={inputClass} maxLength={100} placeholder="City, country" value={values.location} onChange={(event) => setValues({ ...values, location: event.target.value })} />
        </label>
        <label className="text-sm font-medium text-[var(--market-ink)] sm:col-span-2">
          Short bio
          <textarea className={inputClass} rows={4} maxLength={500} value={values.bio} onChange={(event) => setValues({ ...values, bio: event.target.value })} />
          <span className="mt-1 block text-xs font-normal text-gray-500">{values.bio.length}/500</span>
        </label>
      </fieldset>
      {save.isError && <p role="alert" className="mt-4 text-sm text-red-700">{getErrorMessage(save.error, 'Failed to save profile')}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={save.isPending || uploading} className="rounded-full border border-[var(--market-border)] px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-[var(--market-page)] disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={!isDirty || save.isPending || uploading} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--market-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20 disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
