import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const faqs = await prisma.faq.findMany({ select: { question: true, answer: true } }).catch(() => []);
  return NextResponse.json(faqs.map(f => ({ q: f.question, a: f.answer })));
}
