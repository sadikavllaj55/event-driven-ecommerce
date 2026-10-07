import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { profileApi } from '../api/profile';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ROUTES } from '../constants/routes';
import { getErrorMessage } from '../utils/errors';
import ImageUploader from '../components/ImageUploader';
import Avatar from '../components/Avatar';
import type { Profile } from '../types';

const MAX_BIO = 500;

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.profile(user?.sub),
    queryFn: () => profileApi.get(user!.sub),
    enabled: !!user,
  });

  // The server returns the updated profile → put it straight into the cache
  function onSaved(updated: Profile) {
    qc.setQueryData(queryKeys.profile(updated.id), updated);
  }

  const uploadAvatar = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success('Avatar updated 📸');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Avatar upload failed')),
  });

  if (!user) return <Navigate to={ROUTES.login} replace />;
  if (isError)
    return (
      <div role="alert">
        Failed to load profile.{' '}
        <button onClick={() => void refetch()}>Retry</button>
      </div>
    );
  if (isLoading || !profile)
    return <p className="text-gray-500">Loading profile…</p>;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">My profile 👤</h1>
        <Link
          to={ROUTES.seller(profile.id)}
          className="text-sm text-teal-600 hover:underline"
        >
          View my shop →
        </Link>
      </div>

      {/* Current avatar */}
      <div className="flex items-center gap-4 mb-4">
        <Avatar url={profile.avatar_url} name={profile.name} size="lg" />
        <div>
          <p className="font-semibold text-gray-900">{profile.name}</p>
          <p className="text-xs text-gray-500">
            Member since {new Date(profile.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Avatar upload — selecting a photo uploads it immediately */}
      <div
        className={
          uploadAvatar.isPending ? 'opacity-50 pointer-events-none' : ''
        }
      >
        <ImageUploader
          images={[]}
          max={1}
          onChange={(files) => {
            if (files[0]) uploadAvatar.mutate(files[0]);
          }}
        />
        {uploadAvatar.isPending && (
          <p className="text-xs text-gray-500 mt-2">Uploading…</p>
        )}
      </div>

      {/* Bio — key remounts the editor if the profile changes */}
      <BioEditor key={profile.id} initialBio={profile.bio} onSaved={onSaved} />
    </div>
  );
}

function BioEditor({
  initialBio,
  onSaved,
}: {
  initialBio: string;
  onSaved: (p: Profile) => void;
}) {
  const [bio, setBio] = useState(initialBio);
  const [savedBio, setSavedBio] = useState(initialBio);
  const isDirty = bio !== savedBio;
  const tooLong = bio.length > MAX_BIO;

  const save = useMutation({
    mutationFn: () => profileApi.updateBio(bio),
    onSuccess: (updated) => {
      setSavedBio(updated.bio);
      onSaved(updated);
      toast.success('Bio saved');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to save bio')),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="mt-6"
    >
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Bio
      </label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={4}
        placeholder="Tell buyers about yourself and what you sell…"
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      <div className="flex items-center justify-between mt-2">
        <span
          className={`text-xs ${tooLong ? 'text-red-500' : 'text-gray-400'}`}
        >
          {bio.length}/{MAX_BIO}
        </span>
        <button
          type="submit"
          disabled={!isDirty || tooLong || save.isPending}
          className="bg-teal-600 text-white px-4 py-2 rounded font-medium hover:bg-teal-700 disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : 'Save bio'}
        </button>
      </div>
    </form>
  );
}
