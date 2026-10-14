import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { profileApi } from '../api/profile';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import { getErrorMessage } from '../utils/errors';
import Avatar from '../components/Avatar';
import VerifiedBadge from '../components/VerifiedBadge';
import PhoneNumberField from '../components/PhoneNumberField';
import type { AccountProfile, Profile, ProfileUpdate } from '../types';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[var(--market-border)] bg-white px-3 py-2.5 text-sm text-[var(--market-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--market-primary)]/10 disabled:bg-[var(--market-page)] disabled:text-gray-500';
const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--market-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--market-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20 disabled:opacity-50';

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');
  const accountKey = queryKeys.accountProfile(user?.sub);
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: accountKey,
    queryFn: ({ signal }) => profileApi.me(signal),
    enabled: !!user,
  });

  function onSaved(updated: AccountProfile) {
    qc.setQueryData(accountKey, updated);
    qc.setQueryData(queryKeys.profile(updated.id), toPublicProfile(updated));
    void qc.invalidateQueries({ queryKey: ['members'] });
    setEditing(false);
  }

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.profile(updated.id), updated);
      qc.setQueryData<AccountProfile>(accountKey, (current) =>
        current ? { ...current, avatar_url: updated.avatar_url } : current,
      );
      void qc.invalidateQueries({ queryKey: ['members'] });
      toast.success('Avatar updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Avatar upload failed')),
  });

  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (isError)
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
        Failed to load profile.{' '}
        <button onClick={() => void refetch()} className="font-semibold underline">
          Retry
        </button>
      </div>
    );
  if (isLoading || !profile)
    return <p role="status" className="text-gray-500">Loading profile...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--market-primary)]">Your account</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--market-ink)] sm:text-4xl">My profile</h1>
          <p className="mt-2 text-sm text-gray-500">A little about you and the pieces you love.</p>
        </div>
        <Link to={ROUTES.seller(profile.id)} className="text-sm font-medium text-[var(--market-primary)] hover:underline">View my shop &rarr;</Link>
      </div>

      <section className="rounded-2xl border border-[var(--market-border)] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--market-border)] pb-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0">
              <Avatar url={profile.avatar_url} name={profile.name} size="lg" />
            </div>
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--market-ink)]">
                <span className="min-w-0 break-words">{profile.name}</span>
                <VerifiedBadge verified={profile.profile_verified} />
              </h2>
              <p className="mt-1 text-sm text-gray-500">{profile.username ? `@${profile.username}` : 'No username set'}</p>
              <p className="mt-2 text-xs text-gray-500">
                Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
              {editing && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => photoInput.current?.click()}
                    disabled={uploadAvatar.isPending}
                    className="rounded-full border border-[var(--market-border)] px-3 py-1.5 text-xs font-semibold text-[var(--market-primary)] transition hover:bg-[var(--market-primary-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/15 disabled:opacity-50"
                  >
                    {uploadAvatar.isPending ? 'Uploading...' : 'Change photo'}
                  </button>
                  <p className="mt-1.5 text-xs text-gray-500">Image up to 2 MB. Saved immediately.</p>
                </div>
              )}
            </div>
          </div>
          {!editing && <button onClick={() => setEditing(true)} className={buttonClass}>Edit profile</button>}
        </div>

        {editing ? (
          <>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              aria-label="Profile photo"
              className="hidden"
              disabled={uploadAvatar.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setPhotoError('');
                if (!file.type.startsWith('image/')) {
                  setPhotoError('Please select an image.');
                  return;
                }
                if (file.size > 2 * 1024 * 1024) {
                  setPhotoError('Image must be at most 2 MB.');
                  return;
                }
                uploadAvatar.mutate(file);
              }}
            />
            {photoError && <p role="alert" className="mt-3 text-sm text-red-700">{photoError}</p>}
            <ProfileEditor key={profile.id} profile={profile} onSaved={onSaved} onCancel={() => setEditing(false)} uploading={uploadAvatar.isPending} />
          </>
        ) : (
          <>
            <section className="mt-6 rounded-xl bg-[var(--market-page)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--market-ink)]">Contact details</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500">Only visible to you</span>
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {([
                ['Email', profile.email],
                ['Phone number', profile.phone || 'Not set'],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-gray-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-[var(--market-ink)]">{value}</dd>
                </div>
              ))}
              </dl>
            </section>
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[var(--market-ink)]">Location</h3>
              <p className="mt-2 text-sm text-gray-600">{profile.location || 'No location added yet.'}</p>
            </div>
            <div className="mt-5 border-t border-[var(--market-border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--market-ink)]">Short bio</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{profile.bio || 'Tell the community a little about yourself.'}</p>
              <p className="mt-5 text-xs text-gray-500">Your name, username, photo, and bio appear on your public profile.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function toPublicProfile(profile: AccountProfile): Profile {
  return { id: profile.id, name: profile.name, username: profile.username, profile_verified: profile.profile_verified, avatar_url: profile.avatar_url, bio: profile.bio, created_at: profile.created_at };
}

function ProfileEditor({ profile, onSaved, onCancel, uploading }: {
  profile: AccountProfile;
  onSaved: (profile: AccountProfile) => void;
  onCancel: () => void;
  uploading: boolean;
}) {
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
        <PhoneNumberField
          value={values.phone}
          onChange={(phone) => setValues({ ...values, phone })}
        />
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
        <button type="submit" disabled={!isDirty || save.isPending || uploading} className={buttonClass}>{save.isPending ? 'Saving...' : 'Save changes'}</button>
      </div>
    </form>
  );
}
