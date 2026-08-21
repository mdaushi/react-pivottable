import React from 'react';

// Mock react-sortablejs v6: render children inside the given tag without
// any drag-and-drop DOM manipulation (jsdom doesn't support SortableJS).
export function ReactSortable({tag = 'div', className, children, ..._rest}) {
  return React.createElement(
    tag,
    {className, 'data-mock': 'react-sortablejs'},
    children
  );
}

export default {ReactSortable};
