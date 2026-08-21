// Type definitions for PivotTableUI module of @mdaushi/react-pivottable

import React from 'react';
import {PivotTableProps} from './PivotTable';

export interface PivotTableUIProps extends PivotTableProps {
  onChange: (state: Partial<PivotTableUIProps>) => void;
  hiddenAttributes?: string[];
  hiddenFromAggregators?: string[];
  hiddenFromDragDrop?: string[];
  unusedOrientationCutoff?: number;
  menuLimit?: number;
}

export class DraggableAttribute extends React.Component<{
  name: string;
  attrValues: {[value: string]: number};
  valueFilter: {[value: string]: boolean};
  addValuesToFilter: (attribute: string, values: string[]) => void;
  removeValuesFromFilter: (attribute: string, values: string[]) => void;
  setValuesInFilter: (attribute: string, values: string[]) => void;
  moveFilterBoxToTop: (attribute: string) => void;
  sorter: (a: unknown, b: unknown) => number;
  menuLimit: number;
  zIndex: number;
}> {}

export class Dropdown extends React.Component<{
  children?: React.ReactNode;
  zIndex: number;
  current: string;
  name: string;
  values: string[];
  openDropdown: boolean | string;
  setOpenDropdown: (value: boolean | string) => void;
}> {}

export default class PivotTableUI extends React.PureComponent<PivotTableUIProps> {
  static defaultProps: Partial<PivotTableUIProps>;
  static propTypes: object;
}
