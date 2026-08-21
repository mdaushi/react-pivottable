// Type definitions for PlotlyRenderers module of @mdaushi/react-pivottable

import React from 'react';
import {PivotDataProps} from './Utilities';

export interface PlotlyRendererProps extends PivotDataProps {
  plotlyOptions?: object;
  plotlyConfig?: object;
  onRendererUpdate?: () => void;
  rendererName?: string;
}

export default function createPlotlyRenderers(
  PlotlyComponent: React.ComponentType<{
    data: object[];
    layout: object;
    config?: object;
    onUpdate?: () => void;
  }>
): {
  'Grouped Column Chart': React.ComponentType<PlotlyRendererProps>;
  'Stacked Column Chart': React.ComponentType<PlotlyRendererProps>;
  'Grouped Bar Chart': React.ComponentType<PlotlyRendererProps>;
  'Stacked Bar Chart': React.ComponentType<PlotlyRendererProps>;
  'Line Chart': React.ComponentType<PlotlyRendererProps>;
  'Dot Chart': React.ComponentType<PlotlyRendererProps>;
  'Area Chart': React.ComponentType<PlotlyRendererProps>;
  'Scatter Chart': React.ComponentType<PlotlyRendererProps>;
  'Multiple Pie Chart': React.ComponentType<PlotlyRendererProps>;
};
