// Type definitions for PivotTable module of @mdaushi/react-pivottable

import React from 'react';
import {PivotDataProps} from './Utilities';

export interface PivotTableProps extends PivotDataProps {
  rendererName?: string;
  renderers?: {[name: string]: React.ComponentType<PivotTableProps>};
  onRowGroupToggle?: (flatKey: string) => void;
  onColGroupToggle?: (flatKey: string) => void;
  onToggleAllRowGroups?: (flatKeys: string[], expand: boolean) => void;
  onToggleAllColGroups?: (flatKeys: string[], expand: boolean) => void;
}

export default class PivotTable extends React.PureComponent<PivotTableProps> {}
