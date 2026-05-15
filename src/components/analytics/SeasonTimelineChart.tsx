import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { SeasonTimelinePoint } from '../../hooks/useAnalytics';

interface Props {
  data: SeasonTimelinePoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy } = props;
  return <circle cx={cx} cy={cy} r={4} fill="#8b5cf6" stroke="#1f2937" strokeWidth={1.5} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as SeasonTimelinePoint;
  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#e5e7eb', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#a78bfa' }}>
        Anchor: <span style={{ color: '#d1d5db' }}>{point.anchorName}</span>
      </p>
      <p style={{ color: '#9ca3af' }}>
        Avg modifier: <span style={{ color: '#d1d5db' }}>{point.avgModifier.toFixed(4)}</span>
      </p>
      <p style={{ color: '#9ca3af' }}>
        Classes: <span style={{ color: '#d1d5db' }}>{point.classCount}</span>
      </p>
    </div>
  );
}

export function SeasonTimelineChart({ data }: Props) {
  if (!data.length) return null;

  const allMods = data.map((d) => d.avgModifier);
  const overallAvg = allMods.reduce((a, b) => a + b, 0) / allMods.length;

  return (
    <ChartCard
      title="Balance Modifier — Season Timeline"
      subtitle="Avg final_modifier per season (lower = engine converged with less aggressive scaling). Hover for anchor."
      height={260}
      caption="Each season's anchor theme and generation seed affects convergence difficulty. Modifier does not trend monotonically across disconnected seeds."
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 'auto']}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => v.toFixed(2)}
          />
          <ReferenceLine
            y={overallAvg}
            stroke="#374151"
            strokeDasharray="6 3"
            label={{
              value: `avg ${overallAvg.toFixed(3)}`,
              position: 'insideTopRight',
              fill: '#4b5563',
              fontSize: 9,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="avgModifier"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#a78bfa', strokeWidth: 0 }}
            name="Avg modifier"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
