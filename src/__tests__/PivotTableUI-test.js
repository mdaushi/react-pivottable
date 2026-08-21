/* eslint-disable no-magic-numbers */

// React 18 act() support
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import PivotTableUI from '../PivotTableUI';
import TableRenderers from '../TableRenderers';

// Mock react-sortablejs and react-draggable — jsdom can't run their DOM APIs
jest.mock('react-sortablejs');
jest.mock('react-draggable');

const fixtureData = [
  ['name', 'gender', 'colour', 'birthday', 'trials', 'successes'],
  ['Nick', 'male', 'blue', '1982-11-07', 103, 12],
  ['Jane', 'female', 'red', '1982-11-08', 95, 25],
  ['John', 'male', 'blue', '1982-12-08', 112, 30],
  ['Carol', 'female', 'yellow', '1983-12-08', 102, 14],
];

let container = null;
let root = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  container = null;
});

function renderPivotUI(props) {
  act(() => {
    root.render(
      <PivotTableUI
        data={fixtureData}
        rows={[]}
        cols={[]}
        aggregatorName="Count"
        rendererName="Table"
        renderers={TableRenderers}
        onChange={() => {}}
        {...props}
      />
    );
  });
}

describe('PivotTableUI', () => {
  it('renders without crashing', () => {
    renderPivotUI({});
    expect(container.querySelector('.pvtUi')).toBeTruthy();
  });

  it('renders the renderer dropdown with all table renderers', () => {
    renderPivotUI({});
    const rendererCell = container.querySelector('.pvtRenderers');
    expect(rendererCell).toBeTruthy();
    const dropdownValues = container.querySelectorAll(
      '.pvtRenderers .pvtDropdownValue'
    );
    // Current value + all options (only visible when open, but current always
    // shows)
    expect(dropdownValues.length).toBeGreaterThanOrEqual(1);
    // Verify the current renderer name is displayed
    expect(rendererCell.textContent).toContain('Table');
  });

  it('renders the aggregator dropdown', () => {
    renderPivotUI({});
    const aggregatorCell = container.querySelector('.pvtVals');
    expect(aggregatorCell).toBeTruthy();
    expect(aggregatorCell.textContent).toContain('Count');
  });

  it('displays unused attributes in the unused section', () => {
    renderPivotUI({rows: ['gender'], cols: ['colour']});
    const unusedSection = container.querySelector('.pvtUnused');
    expect(unusedSection).toBeTruthy();
    // name and birthday are not in rows or cols, so they should be unused
    expect(unusedSection.textContent).toContain('name');
    expect(unusedSection.textContent).toContain('birthday');
  });

  it('displays row attributes in the rows section', () => {
    renderPivotUI({rows: ['gender', 'name']});
    const rowsSection = container.querySelector('.pvtRows');
    expect(rowsSection).toBeTruthy();
    expect(rowsSection.textContent).toContain('gender');
    expect(rowsSection.textContent).toContain('name');
  });

  it('displays column attributes in the cols section', () => {
    renderPivotUI({cols: ['colour']});
    const colsSection = container.querySelector('.pvtCols');
    expect(colsSection).toBeTruthy();
    expect(colsSection.textContent).toContain('colour');
  });

  it('renders the pivot table output', () => {
    renderPivotUI({rows: ['gender'], cols: ['colour']});
    const outputCell = container.querySelector('.pvtOutput');
    expect(outputCell).toBeTruthy();
    // The output should contain a rendered table from TableRenderers
    expect(outputCell.querySelector('table')).toBeTruthy();
  });

  it('calls onChange when renderer is changed via propUpdater', () => {
    let onChangeCalled = false;
    let newState = null;
    renderPivotUI({
      onChange: (s) => {
        onChangeCalled = true;
        newState = s;
      },
    });
    // Click on the renderer dropdown to open it
    const rendererDropdown = container.querySelector(
      '.pvtRenderers .pvtDropdownCurrent'
    );
    expect(rendererDropdown).toBeTruthy();
    act(() => {
      rendererDropdown.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });
    // Now click on a different renderer option
    const options = container.querySelectorAll(
      '.pvtRenderers .pvtDropdownMenu .pvtDropdownValue'
    );
    if (options.length > 1) {
      act(() => {
        options[1].dispatchEvent(new MouseEvent('click', {bubbles: true}));
      });
      expect(onChangeCalled).toBe(true);
      expect(newState).toBeTruthy();
      expect(newState.rendererName).toBeDefined();
    }
  });

  it('hides attributes listed in hiddenAttributes', () => {
    renderPivotUI({hiddenAttributes: ['birthday']});
    const unusedSection = container.querySelector('.pvtUnused');
    expect(unusedSection.textContent).not.toContain('birthday');
  });

  it('hides attributes listed in hiddenFromDragDrop from unused section', () => {
    renderPivotUI({hiddenFromDragDrop: ['name']});
    const unusedSection = container.querySelector('.pvtUnused');
    expect(unusedSection.textContent).not.toContain('name');
  });
});
