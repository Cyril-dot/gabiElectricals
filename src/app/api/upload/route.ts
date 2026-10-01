import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX = 20 * 1024 * 1024; // 20MB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};
// never these, whatever the browser claims
const BAD_EXT = ['exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'js', 'jar', 'sh', 'ps1', 'vbs', 'dll', 'apk', 'php'];

function looksLikeMagic(mime: string, buf: Buffer): boolean {
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8;
  if (mime === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50;
  if (mime === 'image/gif') return buf[0] === 0x47 && buf[1] === 0x49;
  if (mime === 'image/webp') return buf.subarray(0, 4).toString('latin1') === 'RIFF';
  if (mime === 'video/mp4' || mime === 'video/webm') return true; // container sniff kept light
  return false;
}

/** POST /api/upload — multipart form, field "file". Returns { path } under /uploads */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'file (multipart field) is required' }, { status: 400 });

    const name = (file.name || '').toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop()! : '';
    if (BAD_EXT.includes(ext)) return NextResponse.json({ error: 'Executable files are not allowed' }, { status: 415 });
    if (!file.type || !ALLOWED[file.type]) {
      return NextResponse.json({ error: `Unsupported file type. Allowed: JPG, PNG, WebP, GIF, MP4, MOV, WebM (max 20MB)` }, { status: 415 });
    }
    if (file.size > MAX) return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 413 });
    if (file.size === 0) return NextResponse.json({ error: 'Empty file' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    if (!looksLikeMagic(file.type, buf)) return NextResponse.json({ error: 'File content does not match its type' }, { status: 415 });

    const rand = randomBytes(8).toString('hex');
    const fname = `${Date.now().toString(36)}-${rand}.${ALLOWED[file.type]}`;
    const dir = join(process.cwd(), 'public', 'uploads');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, fname), buf);
    const path = `/uploads/${fname}`;

    await prisma.uploadedFile.create({ data: { path, name: file.name || fname, mime: file.type, size: file.size, kind: 'BOOKING' } });
    return NextResponse.json({ path, name: file.name, size: file.size }, { status: 201 });
  } catch (e) {
    console.error('upload error', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
