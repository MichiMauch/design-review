import { useState } from 'react';
import { Users } from 'lucide-react';

const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-red-500';
    case 'user':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const UserAvatar = ({ user, size = 'sm' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${getRoleColor(user.role)}
        rounded-full
        flex items-center justify-center
        text-white font-medium
        border-2 border-white
        shadow-sm
        hover:scale-110
        transition-transform duration-200
        cursor-pointer
      `}
      title={`${user.name} (${user.role})`}
    >
      {user.initials}
    </div>
  );
};

export default function UserAvatarList({
  users = [],
  maxVisible = 3,
  size = 'sm',
  showCount = true,
  onClick = null,
  className = ''
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;
  const hasMore = remainingCount > 0;

  if (users.length === 0) {
    return null;
  }

  const handleClick = () => {
    if (onClick) {
      onClick(users);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`flex items-center ${onClick ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Avatar Stack */}
        <div className="flex -space-x-1">
          {visibleUsers.map((user, index) => (
            <UserAvatar
              key={user.id}
              user={user}
              size={size}
            />
          ))}

          {/* More users indicator */}
          {hasMore && (
            <div
              className={`
                ${size === 'xs' ? 'w-6 h-6 text-xs' : ''}
                ${size === 'sm' ? 'w-8 h-8 text-sm' : ''}
                ${size === 'md' ? 'w-10 h-10 text-base' : ''}
                ${size === 'lg' ? 'w-12 h-12 text-lg' : ''}
                bg-gray-400
                rounded-full
                flex items-center justify-center
                text-white font-medium
                border-2 border-white
                shadow-sm
                hover:scale-110
                transition-transform duration-200
              `}
              title={`+${remainingCount} weitere Benutzer`}
            >
              +{remainingCount}
            </div>
          )}
        </div>

        {/* Count badge */}
        {showCount && users.length > 0 && (
          <div className="ml-2 flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{users.length}</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && users.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg min-w-max">
            <div className="space-y-1">
              {visibleUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <UserAvatar user={user} size="xs" />
                  <span>{user.name}</span>
                  <span className="text-gray-300">({user.role})</span>
                </div>
              ))}
              {hasMore && (
                <div className="text-gray-400 text-center pt-1 border-t border-gray-700">
                  +{remainingCount} weitere
                </div>
              )}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}