import React from 'react';
import Input from '../../atoms/Input/Input';
import Icon from '../../atoms/Icon/Icon';
import './SearchBar.css';

const SearchBar = ({ value, onChange, placeholder = 'Search', showIcon = false, ...props }) => {
  return (
    <div className="search-bar">
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        icon={showIcon ? <Icon name="search" size={16} /> : null}
        {...props}
      />
      <span className="search-shortcut">⌘K</span>
    </div>
  );
};

export default SearchBar;
