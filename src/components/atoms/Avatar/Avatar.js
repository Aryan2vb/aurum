import React from 'react';
import './Avatar.css';

/**
 * Avatar - Shows customer identity with initials or image
 */
const Avatar = ({
  name,
  imageUrl,
  size = 'md',
  status,
  className = '',
  ...props
}) => {
  const getInitials = (nameStr) => {
    if (!nameStr) return '?';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  // Get avatar class based on first letter - same as customer table
  const getAvatarClass = (nameStr) => {
    if (!nameStr) return 'avatar-default';
    const letter = nameStr.trim()[0].toUpperCase();
    const classes = {
      G: 'avatar-g', M: 'avatar-m', D: 'avatar-d', A: 'avatar-a',
      U: 'avatar-u', P: 'avatar-p', L: 'avatar-l', I: 'avatar-i',
      R: 'avatar-r', S: 'avatar-s', K: 'avatar-k', B: 'avatar-b',
      J: 'avatar-j', N: 'avatar-n', T: 'avatar-t', V: 'avatar-v',
      W: 'avatar-w', H: 'avatar-h', C: 'avatar-c', E: 'avatar-e',
      F: 'avatar-f', O: 'avatar-o', Q: 'avatar-q', X: 'avatar-x',
      Y: 'avatar-y', Z: 'avatar-z'
    };
    return classes[letter] || 'avatar-default';
  };

  const initials = getInitials(name);
  const sizeClass = `avatar-${size}`;
  const statusClass = status ? `avatar-${status}` : '';
  const gradientClass = getAvatarClass(name);

  return (
    <div className={`avatar ${sizeClass} ${statusClass} ${gradientClass} ${className}`} {...props}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="avatar-image" />
      ) : (
        <span className="avatar-initials">{initials}</span>
      )}
      {status && <span className={`avatar-status avatar-status-${status}`} />}
    </div>
  );
};

export default Avatar;
