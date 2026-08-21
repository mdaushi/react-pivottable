import React from 'react';

// Mock react-draggable: render children as-is without drag event listeners.
export default function Draggable({children, _nodeRef, ..._rest}) {
  return <>{children}</>;
}
