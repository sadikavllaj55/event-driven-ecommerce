import { Link } from 'react-router-dom';
import type { Profile } from '../types';
import { ROUTES } from '../constants/routes';
import Avatar from './Avatar';

interface MemberSearchResultsProps {
  search: string;
  members?: Profile[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
}

export default function MemberSearchResults({
  search,
  members,
  isLoading,
  isError,
  isFetching,
}: MemberSearchResultsProps) {
  return (
    <div aria-live="polite">
      {search && isLoading && (
        <p role="status" className="text-gray-500">
          Loading members...
        </p>
      )}
      {isError && <p className="text-red-500">Failed to load members.</p>}
      {search && members?.length === 0 && (
        <p className="text-gray-500">No members found.</p>
      )}
      <div
        className={`divide-y divide-gray-200 transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}
      >
        {search &&
          members?.map((member) => (
            <Link
              key={member.id}
              to={ROUTES.seller(member.id)}
              className="flex items-center gap-3 px-2 py-4 hover:bg-gray-50 focus-visible:outline-teal-600"
            >
              <Avatar url={member.avatar_url} name={member.name} />
              <div className="min-w-0">
                <p className="break-words font-medium text-gray-900">
                  {member.name}
                </p>
                {member.bio && (
                  <p className="line-clamp-2 break-words text-sm text-gray-500">
                    {member.bio}
                  </p>
                )}
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
