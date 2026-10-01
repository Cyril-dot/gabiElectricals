'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ghs } from '@/lib/money';

export default function RechartsBars({ data }: { data: { day: string; sales: number }[] }) {
  return (
    <div className="h-56 w-full md:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-soft)' }} tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-soft)' }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(v) => [ghs(Number(v)), 'Sales']}
            contentStyle={{ background: 'var(--color-white)', border: '1px solid var(--color-line)', borderRadius: 12, fontSize: 12, fontWeight: 700 }}
          />
          <Bar dataKey="sales" fill="var(--color-blue)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
