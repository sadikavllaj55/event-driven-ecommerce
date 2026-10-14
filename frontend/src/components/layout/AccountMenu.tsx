import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useAuth } from '../../auth/AuthContext';
import { profileApi } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import { ROUTES } from '../../constants/routes';
import Avatar from '../Avatar';
import VerifiedBadge from '../VerifiedBadge';

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      {children}
    </svg>
  );
}

function ProfileIcon() {
  return (
    <MenuIcon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.6-3.4 3.3-5.5 7-5.5s6.4 2.1 7 5.5" />
    </MenuIcon>
  );
}

function BellIcon() {
  return (
    <MenuIcon>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </MenuIcon>
  );
}

function MessageIcon() {
  return (
    <MenuIcon>
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.2-.7L4 20l1.7-4.1A7.4 7.4 0 0 1 5 12a7.5 7.5 0 0 1 7.5-7.5A7.5 7.5 0 0 1 20 11.5Z" />
      <path d="M8.5 12h7" />
    </MenuIcon>
  );
}

function LogoutIcon() {
  return (
    <MenuIcon>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </MenuIcon>
  );
}

const itemClass =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors data-focus:bg-[var(--market-page)] data-focus:text-[var(--market-ink)]';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile(user?.sub),
    queryFn: () => profileApi.get(user!.sub),
    enabled: !!user,
  });

  if (!user) return null;

  const displayName = profile?.name || user.email;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label={`Open account menu for ${displayName}`}
        className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--market-border)] bg-white p-1 shadow-sm transition hover:border-[var(--market-primary)]/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--market-primary)]/20"
      >
        <Avatar
          url={profile?.avatar_url || undefined}
          name={displayName}
          size="sm"
        />
      </MenuButton>

      <MenuItems
        anchor={{ to: 'bottom end', gap: 10, padding: 12 }}
        transition
        className="z-50 w-[min(18rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-[var(--market-border)] bg-white p-2 shadow-xl shadow-[var(--market-ink)]/10 outline-none transition duration-150 ease-out data-closed:scale-95 data-closed:opacity-0"
      >
        <div className="mb-1 border-b border-[var(--market-border)] px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--market-ink)]">
            <span className="truncate">{displayName}</span>
            <VerifiedBadge verified={profile?.profile_verified} />
          </p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>

        <MenuItem>
          <Link to={ROUTES.myProfile} className={itemClass}>
            <span className="text-[var(--market-primary)]">
              <ProfileIcon />
            </span>
            Profile
          </Link>
        </MenuItem>
        <MenuItem disabled>
          <button
            type="button"
            className={`${itemClass} cursor-not-allowed text-gray-400`}
            title="Notifications are not available yet"
          >
            <BellIcon />
            <span className="flex-1">Notifications</span>
            <span className="text-[10px] font-medium uppercase tracking-wide">
              Unavailable
            </span>
          </button>
        </MenuItem>
        <MenuItem disabled>
          <button
            type="button"
            className={`${itemClass} cursor-not-allowed text-gray-400`}
            title="Messages are not available yet"
          >
            <MessageIcon />
            <span className="flex-1">Messages</span>
            <span className="text-[10px] font-medium uppercase tracking-wide">
              Unavailable
            </span>
          </button>
        </MenuItem>

        <div className="my-1 border-t border-[var(--market-border)]" />

        <MenuItem>
          <button
            type="button"
            className={`${itemClass} text-red-600 data-focus:bg-red-50 data-focus:text-red-700`}
            onClick={() => {
              logout();
              navigate(ROUTES.home);
            }}
          >
            <LogoutIcon />
            Log out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
