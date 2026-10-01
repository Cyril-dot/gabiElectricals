'use client';
import { useRef, useState } from 'react';
import { Badge, CopyButton, EmptyState, Field, Msg, Tabs, api, inputCls, tableWrap, tdCls, thCls, useMsg } from '@/components/ops/ui';
import { Icon } from '@/components/Icon';

type Hero = { id: string; headline: string; sub: string; ctaLabel: string; ctaHref: string; cta2Label: string | null; cta2Href: string | null; image: string; badge: string | null; sortOrder: number; active: boolean };
type Faq = { id: string; question: string; answer: string; category: string; context: string; sortOrder: number };
type Testi = { id: string; name: string; role: string | null; quote: string; rating: number; avatar: string | null; area: string | null; active: boolean };
type Blog = { id: string; slug: string; title: string; excerpt: string; tags: string[]; published: boolean; cover: string | null; views: number; publishedAt: string; content?: string; metaTitle: string | null; metaDescription: string | null };
type Props = { heroes: Hero[]; faqs: Faq[]; testimonials: Testi[]; blogs: Blog[]; images: { path: string; size: number }[] };

function useCrud(tab: string) {
  const { msg, setMsg } = useMsg();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, text: string) => {
    setBusy(key); setMsg(null);
    try { await fn(); setMsg({ kind: 'ok', text }); setTimeout(() => location.reload(), 600); }
    catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Failed' }); setBusy(null); }
  };
  return { msg, setMsg, busy, run };
}

export function ContentBoard(p: Props) {
  const [tab, setTab] = useState<'hero' | 'faq' | 'testimonial' | 'blog' | 'images'>('hero');
  const { msg, busy, run } = useCrud(tab);
  const [edit, setEdit] = useState<{ model: string; data: Record<string, unknown> } | null>(null);

  return (
    <main className="container-x py-8">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-blue">CMS</p>
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-white">Content studio</h1>
      </header>
      <Tabs
        tabs={[
          { id: 'hero', label: 'Hero slides', count: p.heroes.length },
          { id: 'faq', label: 'FAQs', count: p.faqs.length },
          { id: 'testimonial', label: 'Testimonials', count: p.testimonials.length },
          { id: 'blog', label: 'Blog posts', count: p.blogs.length },
          { id: 'images', label: 'Image library', count: p.images.length },
        ]}
        active={tab}
        onChange={(t) => { setTab(t as typeof tab); setEdit(null); }}
      />
      <Msg msg={msg} />

      {tab === 'hero' && (
        <div className="space-y-3">
          <EntityForm key={`hero-${edit?.model === 'hero' ? String(edit.data.id ?? 'new') : 'new'}`} model="hero" editing={edit?.model === 'hero' ? edit.data : null} busy={busy} onSaved={() => setEdit(null)}
            fields={[
              { name: 'headline', label: 'Headline', required: true },
              { name: 'sub', label: 'Sub-headline', required: true },
              { name: 'ctaLabel', label: 'CTA label', required: true },
              { name: 'ctaHref', label: 'CTA href', required: true },
              { name: 'cta2Label', label: 'CTA 2 label' },
              { name: 'cta2Href', label: 'CTA 2 href' },
              { name: 'image', label: 'Image path (/images/…)', required: true },
              { name: 'badge', label: 'Badge' },
              { name: 'sortOrder', label: 'Sort order', type: 'number' },
              { name: 'active', label: 'Active', type: 'bool' },
            ]}
            run={run} />
          {p.heroes.map((h) => (
            <div key={h.id} className="card flex flex-wrap items-center gap-3 p-3">
              <img src={h.image} alt="" className="h-12 w-20 rounded-lg border border-line object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-navy dark:text-white">{h.headline} <Badge tone={h.active ? 'success' : 'soft'}>{h.active ? 'ON' : 'OFF'}</Badge></p>
                <p className="truncate text-xs text-soft">{h.sub} · {h.ctaLabel} → {h.ctaHref} · order {h.sortOrder}</p>
              </div>
              <div className="flex gap-1.5">
                <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setEdit({ model: 'hero', data: h as never })}>Edit</button>
                <button disabled={busy === h.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(h.id, () => api(`/api/admin/content/hero/${h.id}`, { method: 'DELETE' }), 'Slide deleted')}>Delete</button>
              </div>
            </div>
          ))}
          {p.heroes.length === 0 && <EmptyState text="No hero slides." />}
        </div>
      )}

      {tab === 'faq' && (
        <div className="space-y-3">
          <EntityForm key={`faq-${edit?.model === 'faq' ? String(edit.data.id ?? 'new') : 'new'}`} model="faq" editing={edit?.model === 'faq' ? edit.data : null} busy={busy} onSaved={() => setEdit(null)}
            fields={[
              { name: 'question', label: 'Question', required: true },
              { name: 'answer', label: 'Answer', required: true, type: 'textarea' },
              { name: 'category', label: 'Category', type: 'select', options: ['General', 'Shop', 'Delivery', 'Payments', 'Services'] },
              { name: 'context', label: 'Context', type: 'select', options: ['PUBLIC', 'CHATBOT'] },
              { name: 'sortOrder', label: 'Sort order', type: 'number' },
            ]}
            run={run} />
          <div className={tableWrap}>
            <table className="w-full min-w-[600px]">
              <thead className="border-b border-line bg-mist"><tr>{['Q', 'A', 'Category', 'Context', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>{p.faqs.map((f) => (
                <tr key={f.id} className="border-b border-line/60 last:border-0">
                  <td className={`${tdCls} max-w-56 font-semibold`}>{f.question}</td>
                  <td className={`${tdCls} max-w-72 truncate text-soft`}>{f.answer}</td>
                  <td className={tdCls}><Badge tone="info">{f.category}</Badge></td>
                  <td className={`${tdCls} text-xs`}>{f.context}</td>
                  <td className={tdCls}>
                    <div className="flex gap-1.5">
                      <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setEdit({ model: 'faq', data: f as never })}>Edit</button>
                      <button disabled={busy === f.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(f.id, () => api(`/api/admin/content/faq/${f.id}`, { method: 'DELETE' }), 'FAQ deleted')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'testimonial' && (
        <div className="space-y-3">
          <EntityForm key={`testimonial-${edit?.model === 'testimonial' ? String(edit.data.id ?? 'new') : 'new'}`} model="testimonial" editing={edit?.model === 'testimonial' ? edit.data : null} busy={busy} onSaved={() => setEdit(null)}
            fields={[
              { name: 'name', label: 'Name', required: true },
              { name: 'role', label: 'Role' },
              { name: 'quote', label: 'Quote', required: true, type: 'textarea' },
              { name: 'rating', label: 'Rating 1–5', type: 'number' },
              { name: 'avatar', label: 'Avatar path' },
              { name: 'area', label: 'Area' },
              { name: 'active', label: 'Active', type: 'bool' },
            ]}
            run={run} />
          <div className="grid gap-3 md:grid-cols-2">
            {p.testimonials.map((t) => (
              <div key={t.id} className="card p-4">
                <p className="text-sm font-bold text-navy dark:text-white">{t.name} <span className="font-normal text-soft">{t.role ? `· ${t.role}` : ''} {t.area ? `· ${t.area}` : ''}</span> <Badge tone={t.active ? 'success' : 'soft'}>{t.active ? 'ON' : 'OFF'}</Badge></p>
                <p className="mt-1 text-xs text-soft">{Array.from({length:5},(_,i)=>(<Icon key={i} name="star" size={13} filled={i<t.rating} className={i<t.rating?'text-gold':'text-line'} />))}</p>
                <p className="mt-1 text-sm">“{t.quote}”</p>
                <div className="mt-2 flex gap-1.5">
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setEdit({ model: 'testimonial', data: t as never })}>Edit</button>
                  <button disabled={busy === t.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(t.id, () => api(`/api/admin/content/testimonial/${t.id}`, { method: 'DELETE' }), 'Deleted')}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          {p.testimonials.length === 0 && <EmptyState text="No testimonials." />}
        </div>
      )}

      {tab === 'blog' && (
        <div className="space-y-3">
          <EntityForm key={`blog-${edit?.model === 'blog' ? String(edit.data.id ?? 'new') : 'new'}`} model="blog" editing={edit?.model === 'blog' ? edit.data : null} busy={busy} onSaved={() => setEdit(null)}
            fields={[
              { name: 'title', label: 'Title', required: true },
              { name: 'excerpt', label: 'Excerpt', required: true, type: 'textarea' },
              { name: 'content', label: 'Content (markdown-lite: ## heading, 1. list, **bold**, > quote)', required: true, type: 'textarea', rows: 8 },
              { name: 'cover', label: 'Cover image path' },
              { name: 'tags', label: 'Tags (comma separated)', type: 'tags' },
              { name: 'metaTitle', label: 'Meta title' },
              { name: 'metaDescription', label: 'Meta description' },
              { name: 'published', label: 'Published', type: 'bool' },
            ]}
            run={run} />
          <div className={tableWrap}>
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-mist"><tr>{['Title', 'Slug', 'Tags', 'Views', 'Status', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>{p.blogs.map((b) => (
                <tr key={b.id} className="border-b border-line/60 last:border-0">
                  <td className={`${tdCls} max-w-64 font-semibold`}>{b.title}</td>
                  <td className={`${tdCls} font-mono text-xs text-blue`}><a href={`/blog/${b.slug}`} target="_blank" rel="noreferrer" className="hover:underline">{b.slug}</a></td>
                  <td className={`${tdCls} text-xs text-soft`}>{b.tags.join(', ') || '—'}</td>
                  <td className={tdCls}>{b.views}</td>
                  <td className={tdCls}><Badge tone={b.published ? 'success' : 'soft'}>{b.published ? 'LIVE' : 'DRAFT'}</Badge></td>
                  <td className={tdCls}>
                    <div className="flex gap-1.5">
                      <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setEdit({ model: 'blog', data: b as never })}>Edit</button>
                      <button disabled={busy === b.id} className="btn-ghost px-2.5 py-1 text-xs" onClick={() => run(b.id, () => api(`/api/admin/content/blog/${b.id}`, { method: 'PATCH', body: JSON.stringify({ published: !b.published }) }), 'Toggled')}>{b.published ? 'Unpublish' : 'Publish'}</button>
                      <button disabled={busy === b.id} className="btn-ghost px-2.5 py-1 text-xs text-danger" onClick={() => run(b.id, () => api(`/api/admin/content/blog/${b.id}`, { method: 'DELETE' }), 'Post deleted')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'images' && <ImageLibrary images={p.images} run={run} setBusy={busy !== null} />}
    </main>
  );
}

type FieldDef = { name: string; label: string; required?: boolean; type?: 'text' | 'number' | 'bool' | 'textarea' | 'select' | 'tags'; options?: string[]; rows?: number };

function EntityForm({ model, fields, editing, busy, run, onSaved }: { model: string; fields: FieldDef[]; editing: Record<string, unknown> | null; busy: string | null; onSaved: () => void; run: (k: string, fn: () => Promise<unknown>, t: string) => Promise<void> }) {
  const [f, setF] = useState<Record<string, string | boolean>>({});
  const id = editing ? String(editing.id) : '';
  const get = (fd: FieldDef): string | boolean => {
    if (f[fd.name] !== undefined) return f[fd.name];
    const v = editing?.[fd.name];
    if (fd.type === 'tags') return Array.isArray(v) ? (v as string[]).join(', ') : '';
    if (typeof v === 'boolean') return v;
    return v === null || v === undefined ? '' : String(v);
  };
  const set = (name: string, v: string | boolean) => setF((p) => ({ ...p, [name]: v }));

  async function submit() {
    const body: Record<string, unknown> = {};
    for (const fd of fields) {
      const raw = get(fd);
      if (f[fd.name] === undefined && !editing) continue;
      if (fd.type === 'number') body[fd.name] = raw === '' ? 0 : Number(raw);
      else if (fd.type === 'bool') body[fd.name] = Boolean(raw);
      else if (fd.type === 'tags') body[fd.name] = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
      else body[fd.name] = raw;
    }
    await run(editing ? `edit-${id}` : 'new', () => api(editing ? `/api/admin/content/${model}/${id}` : `/api/admin/content/${model}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) }), editing ? 'Saved.' : 'Created.');
    setF({});
    onSaved();
  }

  return (
    <section className="card mb-4 p-4">
      <h2 className="font-display mb-3 text-base font-bold text-navy dark:text-white">{editing ? `Edit ${model} #${id}` : `New ${model}`}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((fd) => (
          <Field key={fd.name} label={fd.label}>
            {fd.type === 'bool' ? (
              <input type="checkbox" className="h-5 w-5 accent-[#0C4A55]" checked={Boolean(get(fd))} onChange={(e) => set(fd.name, e.target.checked)} />
            ) : fd.type === 'textarea' ? (
              <textarea rows={fd.rows ?? 3} required={fd.required} className={inputCls} value={String(get(fd))} onChange={(e) => set(fd.name, e.target.value)} />
            ) : fd.type === 'select' ? (
              <select className={inputCls} value={String(get(fd)) || fd.options?.[0]} onChange={(e) => set(fd.name, e.target.value)}>{fd.options?.map((o) => <option key={o}>{o}</option>)}</select>
            ) : (
              <input required={fd.required} type={fd.type === 'number' ? 'number' : 'text'} className={inputCls} value={String(get(fd))} onChange={(e) => set(fd.name, e.target.value)} />
            )}
          </Field>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button disabled={busy !== null} className="btn-primary px-4 py-2 text-sm" onClick={submit}>{editing ? 'Save changes' : 'Create'}</button>
        {editing && <button className="btn-ghost px-4 py-2 text-sm" onClick={onSaved}>Cancel</button>}
      </div>
    </section>
  );
}

function ImageLibrary({ images, run, setBusy }: { images: { path: string; size: number }[]; run: (k: string, fn: () => Promise<unknown>, t: string) => Promise<void>; setBusy: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card h-fit p-4 lg:col-span-1">
        <h2 className="font-display mb-2 text-base font-bold text-navy dark:text-white">Upload</h2>
        <p className="mb-3 text-xs text-soft">JPG/PNG/WebP/GIF/MP4 up to 20MB → /uploads via existing uploader.</p>
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" className="mb-3 block w-full text-xs" />
        <button disabled={setBusy} className="btn-gold w-full px-4 py-2 text-sm" onClick={async () => {
          const file = fileRef.current?.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.append('file', file);
          await run('up', async () => {
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error ?? 'Upload failed');
          }, `Uploaded /uploads/${file.name}`);
        }}>Upload file</button>
      </section>
      <section className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.path} className="card overflow-hidden">
              <img src={img.path} alt="" className="h-28 w-full object-cover" loading="lazy" />
              <div className="p-2">
                <p className="truncate font-mono text-[10px] text-soft" title={img.path}>{img.path}</p>
                <p className="text-[10px] text-soft">{(img.size / 1024).toFixed(0)} KB</p>
                <div className="mt-1 flex gap-1"><CopyButton text={img.path} label="Copy path" /><a className="btn-ghost px-2 py-1 text-[10px]" href={img.path} target="_blank" rel="noreferrer">Open</a></div>
              </div>
            </div>
          ))}
        </div>
        {images.length === 0 && <EmptyState text="public/images is empty." />}
      </section>
    </div>
  );
}
