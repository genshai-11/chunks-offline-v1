import React, { useMemo, useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Eye, EyeOff, Filter, MousePointer2, PieChart as PieIcon, Table2 } from 'lucide-react';
import {
  AggregationType,
  ChartDefinition,
  ChartType,
  ExplorerRow,
  buildCategoryChartData,
  buildExplorerRows,
  buildPivotSummary,
  buildScatterChartData,
  explorerColumns,
  formatExplorerNumber,
} from '../lib/dataExplorer';

interface DataExplorerTabProps {
  historyItems: any[];
}

const gradeColor = (grade: string) => {
  switch (String(grade || '').toLowerCase()) {
    case 'purple': return '#9333ea';
    case 'green': return '#22c55e';
    case 'yellow': return '#eab308';
    case 'red': return '#ef4444';
    default: return '#64748b';
  }
};

const numericFields = explorerColumns.filter(col => col.type === 'number').map(col => col.key);
const categoryFields = explorerColumns.filter(col => col.chartRole === 'category' || col.chartRole === 'both').map(col => col.key);

export default function DataExplorerTab({ historyItems }: DataExplorerTabProps) {
  const rows = useMemo(() => buildExplorerRows(historyItems), [historyItems]);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'submittedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => Object.fromEntries(
    explorerColumns.map(col => [col.key, col.defaultVisible !== false])
  ));
  const [chartDefinition, setChartDefinition] = useState<ChartDefinition>({
    id: 'chart-1',
    title: 'Max CPD by Learner',
    chartType: 'bar',
    categoryField: 'learnerName',
    valueField: 'cpdResult',
    secondaryValueField: 'reflectionSeconds',
    aggregation: 'max',
    scope: 'filtered',
  });
  const [pivotGroups, setPivotGroups] = useState<(keyof ExplorerRow)[]>(['learnerName', 'grade']);
  const [pivotValueField, setPivotValueField] = useState<keyof ExplorerRow>('cpdResult');
  const [pivotAggregation, setPivotAggregation] = useState<AggregationType>('max');

  const columns = useMemo<ColumnDef<ExplorerRow>[]>(() => explorerColumns.map(meta => ({
    accessorKey: meta.key,
    header: meta.label,
    cell: info => {
      const value = info.getValue() as any;
      if (meta.key === 'sentenceCode') {
        const row = info.row.original;
        return <span title={row.sentenceCodeFull} className="font-mono font-bold text-slate-600">{value}</span>;
      }
      if (meta.key === 'grade') {
        return <span className="capitalize rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: gradeColor(String(value)) }}>{value}</span>;
      }
      if (meta.type === 'number') return <span className="font-mono">{formatExplorerNumber(value)}</span>;
      return <span>{String(value ?? '')}</span>;
    },
    enableSorting: true,
    enableColumnFilter: true,
  })), []);

  const table = useReactTable<ExplorerRow>({
    data: rows,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const filteredRows: ExplorerRow[] = table.getFilteredRowModel().rows.map(row => row.original);
  const selectedRows = filteredRows.filter(row => (rowSelection as Record<string, boolean>)[row.id]);
  const chartRows = chartDefinition.scope === 'selected' ? selectedRows : filteredRows;
  const chartData = useMemo(() => {
    if (chartDefinition.chartType === 'scatter') {
      return buildScatterChartData(chartRows, chartDefinition.categoryField, chartDefinition.secondaryValueField || chartDefinition.valueField);
    }
    return buildCategoryChartData(chartRows, chartDefinition.categoryField, chartDefinition.valueField, chartDefinition.aggregation);
  }, [chartRows, chartDefinition]);

  const pivotRows: Array<{ group: string; rows: number; value: number }> = useMemo(() => buildPivotSummary(filteredRows, pivotGroups, pivotValueField, pivotAggregation), [filteredRows, pivotGroups, pivotValueField, pivotAggregation]);
  const chartCompatible = chartDefinition.chartType !== 'scatter' || (numericFields.includes(chartDefinition.categoryField) && numericFields.includes(chartDefinition.secondaryValueField || chartDefinition.valueField));

  const updateChart = (patch: Partial<ChartDefinition>) => setChartDefinition(current => ({ ...current, ...patch }));

  const columnLabel = (key: keyof ExplorerRow) => explorerColumns.find(col => col.key === key)?.label || String(key);

  const handlePivotGroupChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.currentTarget.selectedOptions as HTMLCollectionOf<HTMLOptionElement>)
      .map(option => option.value as keyof ExplorerRow);
    setPivotGroups(selected.length > 0 ? selected : ['learnerName']);
  };

  const renderChart = () => {
    if (chartDefinition.scope === 'selected' && selectedRows.length === 0) {
      return <div className="flex h-72 items-center justify-center text-xs font-semibold text-slate-400 italic">Select rows to render this selected-row chart.</div>;
    }
    if (!chartCompatible) {
      return <div className="flex h-72 items-center justify-center text-xs font-semibold text-amber-600 bg-amber-50 rounded-xl border border-amber-100">Scatter charts require two numeric fields.</div>;
    }
    if (chartData.length === 0) {
      return <div className="flex h-72 items-center justify-center text-xs font-semibold text-slate-400 italic">No chart data for the current grid scope.</div>;
    }

    if (chartDefinition.chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%" style={{ width: '100%', height: '100%', display: 'block' }}>
          <LineChart data={chartData} margin={{ top: 24, right: 18, left: -16, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line type="monotone" dataKey="value" name={`${chartDefinition.aggregation} ${columnLabel(chartDefinition.valueField)}`} stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartDefinition.chartType === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%" style={{ width: '100%', height: '100%', display: 'block' }}>
          <AreaChart data={chartData} margin={{ top: 24, right: 18, left: -16, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" name="Value" stroke="#4f46e5" fill="#c7d2fe" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartDefinition.chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%" style={{ width: '100%', height: '100%', display: 'block' }}>
          <PieChart>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Pie data={chartData.slice(0, 12)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={95} paddingAngle={2}>
              {chartData.slice(0, 12).map((entry: any, index: number) => (
                <Cell key={`pie-${entry.name}-${index}`} fill={['#ef4444', '#4f46e5', '#10b981', '#f59e0b', '#9333ea', '#06b6d4'][index % 6]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartDefinition.chartType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height="100%" style={{ width: '100%', height: '100%', display: 'block' }}>
          <ScatterChart margin={{ top: 24, right: 18, left: -16, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" dataKey="x" name={columnLabel(chartDefinition.categoryField)} tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <YAxis type="number" dataKey="y" name={columnLabel(chartDefinition.secondaryValueField || chartDefinition.valueField)} tick={{ fontSize: 9 }} stroke="#94a3b8" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Scatter data={chartData} name="Rows">
              {chartData.map((entry: any, index: number) => <Cell key={`scatter-${index}`} fill={gradeColor(entry.grade)} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%" style={{ width: '100%', height: '100%', display: 'block' }}>
        <BarChart data={chartData} margin={{ top: 24, right: 18, left: -16, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="value" name="Value" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2"><Table2 className="w-5 h-5 text-red-400" /> Data Explorer</h3>
            <p className="text-xs text-slate-400 mt-1">Filter, select, group, and chart live classroom responses from the current Reports scope.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono min-w-[320px]">
            <div className="bg-white/5 rounded-xl p-2 border border-white/10"><span className="block text-[9px] text-slate-500 uppercase">Total</span><b>{rows.length}</b></div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10"><span className="block text-[9px] text-slate-500 uppercase">Filtered</span><b>{filteredRows.length}</b></div>
            <div className="bg-white/5 rounded-xl p-2 border border-white/10"><span className="block text-[9px] text-slate-500 uppercase">Selected</span><b>{selectedRows.length}</b></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Live Rows Grid</h4>
            </div>
            <input
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search all visible data..."
              className="w-full md:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[10px]">
            {table.getAllLeafColumns().map(column => (
              <button
                key={column.id}
                type="button"
                onClick={() => column.toggleVisibility()}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold ${column.getIsVisible() ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
              >
                {column.getIsVisible() ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {columnLabel(column.id as keyof ExplorerRow)}
              </button>
            ))}
          </div>

          <div className="overflow-auto max-h-[620px] border border-slate-200 rounded-xl">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    <th className="px-3 py-2 border-b border-slate-200 text-left w-10">
                      <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} />
                    </th>
                    {headerGroup.headers.map(header => {
                      const meta = explorerColumns.find(col => col.key === header.column.id);
                      return (
                        <th
                          key={header.id}
                          className="px-3 py-2 border-b border-slate-200 text-left align-top whitespace-nowrap"
                          onContextMenu={event => {
                            event.preventDefault();
                            if (meta?.chartRole === 'category' || meta?.chartRole === 'both') updateChart({ categoryField: meta.key });
                            if (meta?.chartRole === 'value') updateChart({ valueField: meta.key, aggregation: meta.defaultAggregation || 'avg' });
                          }}
                          title="Right-click: use this column in the chart builder"
                        >
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={header.column.getToggleSortingHandler()} className="font-black text-slate-600 hover:text-red-600">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                            </button>
                            {meta && (meta.chartRole === 'category' || meta.chartRole === 'both') && (
                              <button type="button" onClick={() => updateChart({ categoryField: meta.key })} className="text-[9px] bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 font-bold">X</button>
                            )}
                            {meta && (meta.chartRole === 'value' || meta.chartRole === 'both') && (
                              <button type="button" onClick={() => updateChart({ valueField: meta.key, aggregation: meta.defaultAggregation || 'avg' })} className="text-[9px] bg-red-50 text-red-700 rounded px-1.5 py-0.5 font-bold">Y</button>
                            )}
                          </div>
                          {header.column.getCanFilter() && (
                            <input
                              value={(header.column.getFilterValue() ?? '') as string}
                              onChange={e => header.column.setFilterValue(e.target.value)}
                              placeholder="filter..."
                              className="mt-1 w-full min-w-24 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium outline-none focus:border-red-400"
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr><td colSpan={table.getVisibleLeafColumns().length + 1} className="py-10 text-center text-slate-400 italic">No matching rows.</td></tr>
                ) : table.getRowModel().rows.slice(0, 500).map(row => (
                  <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50 ${row.getIsSelected() ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2"><input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} /></td>
                    {row.getVisibleCells().map(cell => <td key={cell.id} className="px-3 py-2 whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.getRowModel().rows.length > 500 && <p className="text-[10px] text-slate-400 font-semibold">Showing first 500 rendered rows for performance; filters and charts still use all {filteredRows.length} filtered rows.</p>}
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BarChart3 className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Chart Builder</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Chart</span><select value={chartDefinition.chartType} onChange={e => updateChart({ chartType: e.target.value as ChartType })} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option><option value="pie">Pie/Donut</option><option value="scatter">Scatter</option></select></label>
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Scope</span><select value={chartDefinition.scope} onChange={e => updateChart({ scope: e.target.value as any })} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option value="filtered">Filtered rows</option><option value="selected">Selected rows</option></select></label>
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Category / X</span><select value={chartDefinition.categoryField} onChange={e => updateChart({ categoryField: e.target.value as keyof ExplorerRow })} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold">{categoryFields.map(field => <option key={field} value={field}>{columnLabel(field)}</option>)}</select></label>
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Value / Y</span><select value={chartDefinition.valueField} onChange={e => updateChart({ valueField: e.target.value as keyof ExplorerRow })} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold">{numericFields.map(field => <option key={field} value={field}>{columnLabel(field)}</option>)}</select></label>
              {chartDefinition.chartType === 'scatter' && <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Scatter Y</span><select value={chartDefinition.secondaryValueField || chartDefinition.valueField} onChange={e => updateChart({ secondaryValueField: e.target.value as keyof ExplorerRow })} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold">{numericFields.map(field => <option key={field} value={field}>{columnLabel(field)}</option>)}</select></label>}
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Aggregation</span><select value={chartDefinition.aggregation} onChange={e => updateChart({ aggregation: e.target.value as AggregationType })} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option value="count">Count</option><option value="sum">Sum</option><option value="avg">Average</option><option value="min">Min</option><option value="max">Max</option><option value="distinct">Distinct</option></select></label>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 p-2 text-[10px] text-slate-500 font-semibold">
              <MousePointer2 className="w-3.5 h-3.5" /> Tip: use the X/Y buttons in grid headers or right-click a header to send a column into this chart.
            </div>
            <div className="h-72">{renderChart()}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <PieIcon className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">Pivot-style Summary</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 col-span-2"><span className="text-[10px] font-bold uppercase text-slate-400">Group Fields</span><select multiple value={pivotGroups as string[]} onChange={handlePivotGroupChange} className="w-full min-h-20 rounded-lg border border-slate-200 px-2 py-2 font-semibold">{categoryFields.map(field => <option key={field} value={field}>{columnLabel(field)}</option>)}</select></label>
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Metric</span><select value={pivotValueField} onChange={e => setPivotValueField(e.target.value as keyof ExplorerRow)} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold">{numericFields.map(field => <option key={field} value={field}>{columnLabel(field)}</option>)}</select></label>
              <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-slate-400">Agg</span><select value={pivotAggregation} onChange={e => setPivotAggregation(e.target.value as AggregationType)} className="w-full rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option value="count">Count</option><option value="sum">Sum</option><option value="avg">Average</option><option value="min">Min</option><option value="max">Max</option><option value="distinct">Distinct</option></select></label>
            </div>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="text-left px-3 py-2">Group</th><th className="text-right px-3 py-2">Rows</th><th className="text-right px-3 py-2">Value</th></tr></thead>
                <tbody>{pivotRows.length === 0 ? <tr><td colSpan={3} className="py-8 text-center text-slate-400 italic">No summary rows.</td></tr> : pivotRows.map(row => <tr key={row.group} className="border-t border-slate-100"><td className="px-3 py-2 font-bold text-slate-700">{row.group}</td><td className="px-3 py-2 text-right font-mono">{row.rows}</td><td className="px-3 py-2 text-right font-mono font-bold">{formatExplorerNumber(row.value)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
