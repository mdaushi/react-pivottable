// Type definitions for TableRenderers module of @mdaushi/react-pivottable

import React from 'react';
import {PivotTableProps, PivotData} from './PivotTable';
import './Utilities';

export interface DisplayItem {
  key: (string | number)[];
  isSummary: boolean;
  isSubtotal: boolean;
}

export function buildDisplayItems(
  keys: (string | number)[][],
  attrs: string[],
  expandedGroups: {[flatKey: string]: boolean},
  grouping: boolean,
  showSubtotals: boolean
): DisplayItem[];

export function displaySpanSize(
  displayItems: DisplayItem[],
  i: number,
  j: number
): number;

export function getUniquePartialKeys(
  keys: (string | number)[][],
  level: number
): string[];

export function redColorScaleGenerator(
  values: number[]
): (x: number) => {backgroundColor: string};

export type TableRendererProps = PivotTableProps & {
  tableColorScaleGenerator?: typeof redColorScaleGenerator;
  tableOptions?: {
    clickCallback?: (
      e: React.MouseEvent,
      value: number | string,
      filters: {[key: string]: string | number},
      pivotData: PivotData
    ) => void;
  };
};

type RendererMap = {
  Table: React.ComponentType<TableRendererProps>;
  'Table Heatmap': React.ComponentType<TableRendererProps>;
  'Table Col Heatmap': React.ComponentType<TableRendererProps>;
  'Table Row Heatmap': React.ComponentType<TableRendererProps>;
  'Exportable TSV': React.ComponentType<TableRendererProps>;
};

declare const TableRenderers: RendererMap;
export default TableRenderers;
