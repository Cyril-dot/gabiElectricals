'use client';
import dynamic from 'next/dynamic';

const RechartsBars = dynamic(() => import('./_RechartsBars'), { ssr: false, loading: () => <div className="skeleton h-56 w-full" /> });

export function SalesChart({ data }: { data: { day: string; sales: number }[] }) {
  return <RechartsBars data={data} />;
}
