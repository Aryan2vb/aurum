import React from 'react';
import Dot from '../../atoms/Dot/Dot';
import Text from '../../atoms/Text/Text';
import './WorkspaceItem.css';

const WorkspaceItem = ({ label, count, color, onClick }) => {
  return (
    <div className="workspace-item" onClick={onClick}>
      <Dot color={color} />
      <Text variant="body">{label}</Text>
      {count !== undefined && (
        <span className="workspace-count">{count}</span>
      )}
    </div>
  );
};

export default WorkspaceItem;

