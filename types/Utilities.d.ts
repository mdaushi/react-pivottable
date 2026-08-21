// Type definitions for Utilities module of @mdaushi/react-pivottable

export type Record = {
  [key: string]: string | number | boolean | null | undefined;
};

export type Data =
  | (string | number | boolean)[][]
  | Record[]
  | ((record: (rec: Record) => void) => void);

export type SortFunction = (a: unknown, b: unknown) => number;

export type Sorters = SortFunction | {[attribute: string]: SortFunction};

export type Formatter = (x: number | string | boolean) => string;

export interface NumberFormatOptions {
  digitsAfterDecimal?: number;
  scaler?: number;
  thousandsSep?: string;
  decimalSep?: string;
  prefix?: string;
  suffix?: string;
}

export interface Aggregator {
  count?: number;
  push(record: Record): void;
  value(): number | string | null;
  format(x: number | string | null): string;
  numInputs?: number;
}

export type AggregatorFactory = (...vals: string[]) => AggregatorFactoryFn;
export type AggregatorFactoryFn = (
  data: PivotData,
  rowKey: (string | number)[],
  colKey: (string | number)[]
) => Aggregator;

export type Aggregators = {[name: string]: AggregatorFactory};

export interface AggregatorTemplates {
  count(formatter?: Formatter): AggregatorFactory;
  countUnique(formatter?: Formatter): AggregatorFactory;
  listUnique(separator: string): AggregatorFactory;
  sum(formatter?: Formatter): AggregatorFactory;
  min(formatter?: Formatter): AggregatorFactory;
  max(formatter?: Formatter): AggregatorFactory;
  first(formatter?: Formatter): AggregatorFactory;
  last(formatter?: Formatter): AggregatorFactory;
  median(formatter?: Formatter): AggregatorFactory;
  average(formatter?: Formatter): AggregatorFactory;
  var(ddof?: number, formatter?: Formatter): AggregatorFactory;
  stdev(ddof?: number, formatter?: Formatter): AggregatorFactory;
  quantile(quantile: number, formatter?: Formatter): AggregatorFactory;
  runningStat(
    mode: 'mean' | 'var' | 'stdev',
    ddof?: number,
    formatter?: Formatter
  ): AggregatorFactory;
  sumOverSum(formatter?: Formatter): AggregatorFactory;
  uniques(
    aggregatorFn: (values: unknown[]) => number | string,
    formatter?: Formatter
  ): AggregatorFactory;
  extremes(mode: 'min' | 'max' | 'first' | 'last', formatter?: Formatter): AggregatorFactory;
  fractionOf(
    wrapped: AggregatorFactory,
    type?: 'total' | 'row' | 'col',
    formatter?: Formatter
  ): AggregatorFactory;
}

export interface Derivers {
  bin(col: string, binWidth: number): (record: Record) => number;
  dateFormat(
    col: string,
    formatString: string,
    utcOutput?: boolean,
    mthNames?: string[],
    dayNames?: string[]
  ): (record: Record) => string;
}

export interface DerivedAttributes {
  [key: string]: (record: Record) => string | number | null;
}

export type ValueFilter = {[attribute: string]: {[value: string]: boolean}};

export type Order = 'key_a_to_z' | 'value_a_to_z' | 'value_z_to_a';

export type SubtotalLabel = string | ((
  value: string | number,
  level: number,
  key: (string | number)[]
) => string);

export interface PivotDataProps {
  data: Data;
  aggregatorName?: string;
  aggregators?: Aggregators;
  cols?: string[];
  rows?: string[];
  vals?: string[];
  valueFilter?: ValueFilter;
  sorters?: Sorters;
  derivedAttributes?: DerivedAttributes;
  rowOrder?: Order;
  colOrder?: Order;
  grouping?: boolean;
  subtotals?: boolean;
  subtotalLabel?: SubtotalLabel;
  expandedRowGroups?: {[flatKey: string]: boolean};
  expandedColGroups?: {[flatKey: string]: boolean};
}

export class PivotData {
  constructor(inputProps?: Partial<PivotDataProps>);

  props: Required<PivotDataProps>;
  aggregator: AggregatorFactory;
  tree: {[rowKey: string]: {[colKey: string]: Aggregator}};
  rowKeys: (string | number)[][];
  colKeys: (string | number)[][];
  rowTotals: {[flatKey: string]: Aggregator};
  colTotals: {[flatKey: string]: Aggregator};
  allTotal: Aggregator;
  sorted: boolean;

  filter(record: Record): boolean;
  forEachMatchingRecord(
    criteria: {[key: string]: string | number},
    callback: (record: Record) => void
  ): void;
  getRowKeys(): (string | number)[][];
  getColKeys(): (string | number)[][];
  getAggregator(
    rowKey: (string | number)[],
    colKey: (string | number)[]
  ): Aggregator;
  getAggregatorForPartialKeys(
    rowKey: (string | number)[],
    colKey: (string | number)[]
  ): Aggregator;
  sortKeys(): void;
  processRecord(record: Record): void;
  arrSort(attrs: string[]): (a: (string | number)[], b: (string | number)[]) => number;

  static forEachRecord(
    input: Data,
    derivedAttributes: DerivedAttributes,
    f: (record: Record) => void
  ): void;

  static defaultProps: Required<PivotDataProps>;
  static propTypes: object;
}

export function numberFormat(opts_in?: NumberFormatOptions): Formatter;

export function naturalSort(a: unknown, b: unknown): number;

export function sortAs(order: (string | number)[]): SortFunction;

export function getSort(sorters: Sorters, attr: string): SortFunction;

export const derivers: Derivers;

export const aggregatorTemplates: AggregatorTemplates;

export const aggregators: Aggregators;

export const locales: {
  [locale: string]: {
    aggregators: Aggregators;
    localeStrings: {
      [key: string]: string;
    };
  };
};
