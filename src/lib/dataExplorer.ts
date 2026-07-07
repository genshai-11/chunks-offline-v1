import { getShortSentenceCode } from './resourceCode';

export type ExplorerColumnType = 'text' | 'number' | 'date' | 'categorical' | 'identifier';
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter';
export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
export type ChartScope = 'filtered' | 'selected';

export interface ExplorerRow {
  id: string;
  learnerId: string;
  learnerName: string;
  roomId: string;
  roomCode: string;
  roomTitle: string;
  roundId: string;
  roundIndex: number;
  sentenceResourceId: string;
  sentenceCode: string;
  sentenceCodeFull: string;
  grade: string;
  cciPerformanceY: number;
  cciStandardX: number;
  cciResult: number;
  cvrValue: number;
  cpdResult: number;
  reflectionSeconds: number;
  submittedAt: string;
  submittedDate: string;
}

export interface ExplorerColumnMeta {
  key: keyof ExplorerRow;
  label: string;
  type: ExplorerColumnType;
  chartRole: 'category' | 'value' | 'both' | 'none';
  defaultAggregation?: AggregationType;
  defaultVisible?: boolean;
}

export interface ChartDefinition {
  id: string;
  title: string;
  chartType: ChartType;
  categoryField: keyof ExplorerRow;
  valueField: keyof ExplorerRow;
  secondaryValueField?: keyof ExplorerRow;
  aggregation: AggregationType;
  scope: ChartScope;
}

const toNumber = (value: any): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const explorerColumns: ExplorerColumnMeta[] = [
  { key: 'learnerName', label: 'Learner', type: 'text', chartRole: 'category', defaultVisible: true },
  { key: 'roomCode', label: 'Room', type: 'categorical', chartRole: 'category', defaultVisible: true },
  { key: 'roundIndex', label: 'Round', type: 'number', chartRole: 'both', defaultAggregation: 'avg', defaultVisible: true },
  { key: 'sentenceCode', label: 'Sentence', type: 'identifier', chartRole: 'category', defaultVisible: true },
  { key: 'grade', label: 'Grade', type: 'categorical', chartRole: 'category', defaultVisible: true },
  { key: 'cpdResult', label: 'CPD V', type: 'number', chartRole: 'value', defaultAggregation: 'max', defaultVisible: true },
  { key: 'cciResult', label: 'CCI Result', type: 'number', chartRole: 'value', defaultAggregation: 'avg', defaultVisible: true },
  { key: 'cciPerformanceY', label: 'CCI Perf Y', type: 'number', chartRole: 'both', defaultAggregation: 'avg', defaultVisible: true },
  { key: 'cciStandardX', label: 'CCI X', type: 'number', chartRole: 'both', defaultAggregation: 'avg', defaultVisible: true },
  { key: 'cvrValue', label: 'CVR Ω', type: 'number', chartRole: 'both', defaultAggregation: 'avg', defaultVisible: true },
  { key: 'reflectionSeconds', label: 'Reflect Sec', type: 'number', chartRole: 'value', defaultAggregation: 'avg', defaultVisible: false },
  { key: 'submittedDate', label: 'Date', type: 'date', chartRole: 'category', defaultVisible: true },
  { key: 'submittedAt', label: 'Submitted At', type: 'date', chartRole: 'none', defaultVisible: false },
  { key: 'roomTitle', label: 'Room Title', type: 'text', chartRole: 'category', defaultVisible: false },
  { key: 'learnerId', label: 'Learner ID', type: 'identifier', chartRole: 'none', defaultVisible: false },
  { key: 'sentenceCodeFull', label: 'Full Sentence Code', type: 'identifier', chartRole: 'none', defaultVisible: false },
];

export function buildExplorerRows(items: any[]): ExplorerRow[] {
  return items.map((item, index) => {
    const submittedAt = item.submitted_at || item.created_at || '';
    const submittedDate = submittedAt ? new Date(submittedAt).toLocaleDateString() : 'N/A';
    const fullCode = item.sentence?.sentence_code || 'N/A';
    return {
      id: String(item.id || `${item.round_id || 'round'}-${item.learner_id || index}`),
      learnerId: String(item.learner_id || ''),
      learnerName: item.learner?.display_name || 'Anonymous',
      roomId: item.room?.id || item.round?.room_id || '',
      roomCode: item.room?.room_code || 'N/A',
      roomTitle: item.room?.title || 'Unknown Room',
      roundId: item.round_id || item.round?.id || '',
      roundIndex: Number(item.round?.round_index || 0),
      sentenceResourceId: item.round?.sentence_resource_id || item.sentence?.id || '',
      sentenceCode: getShortSentenceCode(fullCode, item.sentence?.order_index),
      sentenceCodeFull: fullCode,
      grade: String(item.response_color || 'unknown').toLowerCase(),
      cciPerformanceY: Number(item.performance_y || 0),
      cciStandardX: Number(item.cci_standard_x || 0),
      cciResult: Number(item.cci_result || 0),
      cvrValue: Number(item.cvr_value || 0),
      cpdResult: Number(item.cpd_result || 0),
      reflectionSeconds: Number(item.reflection_seconds || 0),
      submittedAt,
      submittedDate,
    };
  });
}

export function aggregateValues(rows: ExplorerRow[], field: keyof ExplorerRow, aggregation: AggregationType): number {
  if (aggregation === 'count') return rows.length;
  if (aggregation === 'distinct') return new Set(rows.map(row => String(row[field] ?? ''))).size;
  const values = rows.map(row => toNumber(row[field])).filter((value): value is number => value !== null);
  if (values.length === 0) return 0;
  if (aggregation === 'sum') return values.reduce((sum, value) => sum + value, 0);
  if (aggregation === 'avg') return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (aggregation === 'min') return Math.min(...values);
  if (aggregation === 'max') return Math.max(...values);
  return 0;
}

export function buildCategoryChartData(rows: ExplorerRow[], categoryField: keyof ExplorerRow, valueField: keyof ExplorerRow, aggregation: AggregationType) {
  const groups = new Map<string, ExplorerRow[]>();
  rows.forEach(row => {
    const key = String(row[categoryField] || 'N/A');
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return Array.from(groups.entries())
    .map(([name, groupRows]) => ({
      name,
      value: Math.round(aggregateValues(groupRows, valueField, aggregation) * 100) / 100,
      rows: groupRows.length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);
}

export function buildScatterChartData(rows: ExplorerRow[], xField: keyof ExplorerRow, yField: keyof ExplorerRow) {
  return rows
    .map(row => ({
      x: toNumber(row[xField]),
      y: toNumber(row[yField]),
      name: row.learnerName,
      grade: row.grade,
      sentence: row.sentenceCode,
    }))
    .filter(point => point.x !== null && point.y !== null)
    .map(point => ({ ...point, x: point.x as number, y: point.y as number }));
}

export function buildPivotSummary(rows: ExplorerRow[], groupFields: (keyof ExplorerRow)[], valueField: keyof ExplorerRow, aggregation: AggregationType) {
  const groups = new Map<string, ExplorerRow[]>();
  rows.forEach(row => {
    const key = groupFields.map(field => String(row[field] || 'N/A')).join(' / ');
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return Array.from(groups.entries())
    .map(([group, groupRows]) => ({
      group,
      rows: groupRows.length,
      value: Math.round(aggregateValues(groupRows, valueField, aggregation) * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 100);
}

export function formatExplorerNumber(value: any, suffix = '') {
  const number = Number(value || 0);
  const formatted = Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
  return `${formatted}${suffix}`;
}
