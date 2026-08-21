import React from 'react';
import PropTypes from 'prop-types';
import {PivotData} from './Utilities';

// Build display items (rows or cols) considering expanded/collapsed groups.
// When grouping is enabled, parent groups that are not expanded are collapsed
// into a single summary item with a partial key.
function buildDisplayItems(keys, attrs, expandedGroups, grouping) {
  if (!grouping || attrs.length <= 1) {
    return keys.map(key => ({key, isSummary: false}));
  }

  const displayItems = [];
  const seenCollapsed = new Set();

  for (const key of keys) {
    let collapsedLevel = -1;
    for (let j = 0; j < key.length - 1; j++) {
      const flatKey = key.slice(0, j + 1).join(String.fromCharCode(0));
      if (!(flatKey in expandedGroups)) {
        collapsedLevel = j;
        break;
      }
    }

    if (collapsedLevel >= 0) {
      const partialKey = key.slice(0, collapsedLevel + 1);
      const flatKey = partialKey.join(String.fromCharCode(0));
      if (!seenCollapsed.has(flatKey)) {
        seenCollapsed.add(flatKey);
        displayItems.push({key: partialKey, isSummary: true});
      }
    } else {
      displayItems.push({key, isSummary: false});
    }
  }

  return displayItems;
}

// Compute span size for display items, handling varying key lengths
// (summary items have shorter keys than regular items).
function displaySpanSize(displayItems, i, j) {
  const item = displayItems[i];
  if (j >= item.key.length) {
    return -1;
  }

  // Check if previous item covers this cell
  if (i > 0) {
    const prev = displayItems[i - 1];
    if (j < prev.key.length) {
      let same = true;
      for (let x = 0; x <= j; x++) {
        if (prev.key[x] !== item.key[x]) {
          same = false;
          break;
        }
      }
      if (same) {
        return -1;
      }
    }
  }

  // Count consecutive items with same value at level j
  let len = 0;
  while (i + len < displayItems.length) {
    const next = displayItems[i + len];
    if (j >= next.key.length) {
      break;
    }
    let same = true;
    for (let x = 0; x <= j; x++) {
      if (next.key[x] !== item.key[x]) {
        same = false;
        break;
      }
    }
    if (!same) {
      break;
    }
    len++;
  }

  return len;
}

// Get all unique flat partial keys at a given level (0-indexed).
// Used by the header toggle to expand/collapse all groups at that level.
function getUniquePartialKeys(keys, level) {
  const seen = new Set();
  const result = [];
  for (const key of keys) {
    if (key.length > level) {
      const flat = key.slice(0, level + 1).join(String.fromCharCode(0));
      if (!seen.has(flat)) {
        seen.add(flat);
        result.push(flat);
      }
    }
  }
  return result;
}

function redColorScaleGenerator(values) {
  const min = Math.min.apply(Math, values);
  const max = Math.max.apply(Math, values);
  return x => {
    // eslint-disable-next-line no-magic-numbers
    const nonRed = 255 - Math.round((255 * (x - min)) / (max - min));
    return {backgroundColor: `rgb(255,${nonRed},${nonRed})`};
  };
}

function makeRenderer(opts = {}) {
  class TableRenderer extends React.PureComponent {
    render() {
      const pivotData = new PivotData(this.props);
      const colAttrs = pivotData.props.cols;
      const rowAttrs = pivotData.props.rows;
      const rowKeys = pivotData.getRowKeys();
      const colKeys = pivotData.getColKeys();
      const grandTotalAggregator = pivotData.getAggregator([], []);

      const grouping = this.props.grouping;
      const expandedRowGroups = this.props.expandedRowGroups || {};
      const expandedColGroups = this.props.expandedColGroups || {};
      const onRowGroupToggle = this.props.onRowGroupToggle;
      const onColGroupToggle = this.props.onColGroupToggle;
      const onToggleAllRowGroups = this.props.onToggleAllRowGroups;
      const onToggleAllColGroups = this.props.onToggleAllColGroups;

      const displayRows = buildDisplayItems(
        rowKeys,
        rowAttrs,
        expandedRowGroups,
        grouping
      );
      const displayCols = buildDisplayItems(
        colKeys,
        colAttrs,
        expandedColGroups,
        grouping
      );

      let valueCellColors = () => {};
      let rowTotalColors = () => {};
      let colTotalColors = () => {};
      if (opts.heatmapMode) {
        const colorScaleGenerator = this.props.tableColorScaleGenerator;
        const rowTotalValues = colKeys.map(x =>
          pivotData.getAggregator([], x).value()
        );
        rowTotalColors = colorScaleGenerator(rowTotalValues);
        const colTotalValues = rowKeys.map(x =>
          pivotData.getAggregator(x, []).value()
        );
        colTotalColors = colorScaleGenerator(colTotalValues);

        if (opts.heatmapMode === 'full') {
          const allValues = [];
          rowKeys.map(r =>
            colKeys.map(c =>
              allValues.push(pivotData.getAggregator(r, c).value())
            )
          );
          const colorScale = colorScaleGenerator(allValues);
          valueCellColors = (r, c, v) => colorScale(v);
        } else if (opts.heatmapMode === 'row') {
          const rowColorScales = {};
          rowKeys.map(r => {
            const rowValues = colKeys.map(x =>
              pivotData.getAggregator(r, x).value()
            );
            rowColorScales[r] = colorScaleGenerator(rowValues);
          });
          valueCellColors = (r, c, v) => rowColorScales[r](v);
        } else if (opts.heatmapMode === 'col') {
          const colColorScales = {};
          colKeys.map(c => {
            const colValues = rowKeys.map(x =>
              pivotData.getAggregator(x, c).value()
            );
            colColorScales[c] = colorScaleGenerator(colValues);
          });
          valueCellColors = (r, c, v) => colColorScales[c](v);
        }
      }

      const getClickHandler =
        this.props.tableOptions && this.props.tableOptions.clickCallback
          ? (value, rowValues, colValues) => {
              const filters = {};
              for (const i of Object.keys(colAttrs || {})) {
                const attr = colAttrs[i];
                if (Number(i) < colValues.length && colValues[i] !== null) {
                  filters[attr] = colValues[i];
                }
              }
              for (const i of Object.keys(rowAttrs || {})) {
                const attr = rowAttrs[i];
                if (Number(i) < rowValues.length && rowValues[i] !== null) {
                  filters[attr] = rowValues[i];
                }
              }
              return e =>
                this.props.tableOptions.clickCallback(
                  e,
                  value,
                  filters,
                  pivotData
                );
            }
          : null;

      return (
        <table className="pvtTable">
          <thead>
            {colAttrs.map(function(c, j) {
              return (
                <tr key={`colAttr${j}`}>
                  {j === 0 && rowAttrs.length !== 0 && (
                    <th colSpan={rowAttrs.length} rowSpan={colAttrs.length} />
                  )}
                  <th className="pvtAxisLabel">
                    {grouping &&
                      j < colAttrs.length - 1 &&
                      Boolean(onToggleAllColGroups) &&
                      (() => {
                        const allKeys = getUniquePartialKeys(colKeys, j);
                        const allExpanded = allKeys.every(
                          k => k in expandedColGroups
                        );
                        return (
                          <span
                            className="pvtGroupToggle"
                            onClick={e => {
                              e.stopPropagation();
                              onToggleAllColGroups(allKeys, !allExpanded);
                            }}
                          >
                            {allExpanded ? '▼' : '▶'}
                          </span>
                        );
                      })()}
                    {c}
                  </th>
                  {displayCols.map(function(col, i) {
                    const x = displaySpanSize(displayCols, i, j);
                    if (x === -1) {
                      return null;
                    }
                    const isLastVisible = j === col.key.length - 1;
                    const rowSpan = isLastVisible
                      ? colAttrs.length - j + (rowAttrs.length !== 0 ? 1 : 0)
                      : 1;
                    const canToggle =
                      j < colAttrs.length - 1 && Boolean(onColGroupToggle);
                    const flatKey = col.key
                      .slice(0, j + 1)
                      .join(String.fromCharCode(0));
                    const isExpanded = flatKey in expandedColGroups;
                    return (
                      <th
                        className="pvtColLabel"
                        key={`colKey${i}`}
                        colSpan={x}
                        rowSpan={rowSpan}
                      >
                        {canToggle && (
                          <span
                            className="pvtGroupToggle"
                            onClick={e => {
                              e.stopPropagation();
                              onColGroupToggle(flatKey);
                            }}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                        {col.key[j]}
                      </th>
                    );
                  })}

                  {j === 0 && (
                    <th
                      className="pvtTotalLabel"
                      rowSpan={
                        colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)
                      }
                    >
                      Totals
                    </th>
                  )}
                </tr>
              );
            })}

            {rowAttrs.length !== 0 && (
              <tr>
                {rowAttrs.map(function(r, i) {
                  return (
                    <th className="pvtAxisLabel" key={`rowAttr${i}`}>
                      {grouping &&
                        i < rowAttrs.length - 1 &&
                        Boolean(onToggleAllRowGroups) &&
                        (() => {
                          const allKeys = getUniquePartialKeys(rowKeys, i);
                          const allExpanded = allKeys.every(
                            k => k in expandedRowGroups
                          );
                          return (
                            <span
                              className="pvtGroupToggle"
                              onClick={e => {
                                e.stopPropagation();
                                onToggleAllRowGroups(allKeys, !allExpanded);
                              }}
                            >
                              {allExpanded ? '▼' : '▶'}
                            </span>
                          );
                        })()}
                      {r}
                    </th>
                  );
                })}
                <th className="pvtTotalLabel">
                  {colAttrs.length === 0 ? 'Totals' : null}
                </th>
              </tr>
            )}
          </thead>

          <tbody>
            {displayRows.map(function(displayRow, i) {
              const rowKey = displayRow.key;
              const totalAggregator = displayRow.isSummary
                ? pivotData.getAggregatorForPartialKeys(rowKey, [])
                : pivotData.getAggregator(rowKey, []);
              return (
                <tr key={`rowKeyRow${i}`}>
                  {rowAttrs.map(function(r, j) {
                    if (j >= rowKey.length) {
                      return null;
                    }
                    const x = displaySpanSize(displayRows, i, j);
                    if (x === -1) {
                      return null;
                    }
                    const isLastVisible = j === rowKey.length - 1;
                    const colSpan = isLastVisible
                      ? rowAttrs.length - j + (colAttrs.length !== 0 ? 1 : 0)
                      : 1;
                    const canToggle =
                      j < rowAttrs.length - 1 && Boolean(onRowGroupToggle);
                    const flatKey = rowKey
                      .slice(0, j + 1)
                      .join(String.fromCharCode(0));
                    const isExpanded = flatKey in expandedRowGroups;
                    return (
                      <th
                        key={`rowKeyLabel${i}-${j}`}
                        className="pvtRowLabel"
                        rowSpan={x}
                        colSpan={colSpan}
                      >
                        {canToggle && (
                          <span
                            className="pvtGroupToggle"
                            onClick={e => {
                              e.stopPropagation();
                              onRowGroupToggle(flatKey);
                            }}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        )}
                        {rowKey[j]}
                      </th>
                    );
                  })}
                  {displayCols.map(function(col, j) {
                    const aggregator =
                      displayRow.isSummary || col.isSummary
                        ? pivotData.getAggregatorForPartialKeys(rowKey, col.key)
                        : pivotData.getAggregator(rowKey, col.key);
                    return (
                      <td
                        className="pvtVal"
                        key={`pvtVal${i}-${j}`}
                        onClick={
                          getClickHandler &&
                          getClickHandler(aggregator.value(), rowKey, col.key)
                        }
                        style={valueCellColors(
                          rowKey,
                          col.key,
                          aggregator.value()
                        )}
                      >
                        {aggregator.format(aggregator.value())}
                      </td>
                    );
                  })}
                  <td
                    className="pvtTotal"
                    onClick={
                      getClickHandler &&
                      getClickHandler(totalAggregator.value(), rowKey, [null])
                    }
                    style={colTotalColors(totalAggregator.value())}
                  >
                    {totalAggregator.format(totalAggregator.value())}
                  </td>
                </tr>
              );
            })}

            <tr>
              <th
                className="pvtTotalLabel"
                colSpan={rowAttrs.length + (colAttrs.length === 0 ? 0 : 1)}
              >
                Totals
              </th>

              {displayCols.map(function(col, i) {
                const totalAggregator = col.isSummary
                  ? pivotData.getAggregatorForPartialKeys([], col.key)
                  : pivotData.getAggregator([], col.key);
                return (
                  <td
                    className="pvtTotal"
                    key={`total${i}`}
                    onClick={
                      getClickHandler &&
                      getClickHandler(totalAggregator.value(), [null], col.key)
                    }
                    style={rowTotalColors(totalAggregator.value())}
                  >
                    {totalAggregator.format(totalAggregator.value())}
                  </td>
                );
              })}

              <td
                onClick={
                  getClickHandler &&
                  getClickHandler(grandTotalAggregator.value(), [null], [null])
                }
                className="pvtGrandTotal"
              >
                {grandTotalAggregator.format(grandTotalAggregator.value())}
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
  }

  TableRenderer.defaultProps = PivotData.defaultProps;
  TableRenderer.propTypes = PivotData.propTypes;
  TableRenderer.defaultProps.tableColorScaleGenerator = redColorScaleGenerator;
  TableRenderer.defaultProps.tableOptions = {};
  TableRenderer.propTypes.tableColorScaleGenerator = PropTypes.func;
  TableRenderer.propTypes.tableOptions = PropTypes.object;
  TableRenderer.propTypes.onRowGroupToggle = PropTypes.func;
  TableRenderer.propTypes.onColGroupToggle = PropTypes.func;
  TableRenderer.propTypes.onToggleAllRowGroups = PropTypes.func;
  TableRenderer.propTypes.onToggleAllColGroups = PropTypes.func;
  return TableRenderer;
}

class TSVExportRenderer extends React.PureComponent {
  render() {
    const pivotData = new PivotData(this.props);
    const rowKeys = pivotData.getRowKeys();
    const colKeys = pivotData.getColKeys();
    if (rowKeys.length === 0) {
      rowKeys.push([]);
    }
    if (colKeys.length === 0) {
      colKeys.push([]);
    }

    const headerRow = pivotData.props.rows.map(r => r);
    if (colKeys.length === 1 && colKeys[0].length === 0) {
      headerRow.push(this.props.aggregatorName);
    } else {
      colKeys.map(c => headerRow.push(c.join('-')));
    }

    const result = rowKeys.map(r => {
      const row = r.map(x => x);
      colKeys.map(c => {
        const v = pivotData.getAggregator(r, c).value();
        row.push(v ? v : '');
      });
      return row;
    });

    result.unshift(headerRow);

    return (
      <textarea
        value={result.map(r => r.join('\t')).join('\n')}
        style={{width: window.innerWidth / 2, height: window.innerHeight / 2}}
        readOnly={true}
      />
    );
  }
}

TSVExportRenderer.defaultProps = PivotData.defaultProps;
TSVExportRenderer.propTypes = PivotData.propTypes;

export default {
  Table: makeRenderer(),
  'Table Heatmap': makeRenderer({heatmapMode: 'full'}),
  'Table Col Heatmap': makeRenderer({heatmapMode: 'col'}),
  'Table Row Heatmap': makeRenderer({heatmapMode: 'row'}),
  'Exportable TSV': TSVExportRenderer,
};
