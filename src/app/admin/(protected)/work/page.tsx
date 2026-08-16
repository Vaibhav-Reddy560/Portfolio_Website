import Image from 'next/image';
import Link from 'next/link';
import { imageUrl } from '@/lib/content';
import { authClient } from '@/lib/supabase/server';
import { AttachImageButton, DeleteButton, EditableMeta, PublishToggle } from './row-actions';

type DesignRow = {
  id: string;
  slug: string;
  title: string;
  context: string;
  kind: string;
  year: string;
  ratio: number;
  image_path: string | null;
  published: boolean;
};

async function getDesigns(): Promise<DesignRow[]> {
  const supabase = await authClient();
  // Authenticated RLS sees drafts too — the whole point of this screen.
  const { data, error } = await supabase
    .from('designs')
    .select('id,slug,title,context,kind,year,ratio,image_path,published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export default async function WorkPage() {
  const designs = await getDesigns();
  const drafts = designs.filter((d) => !d.published);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="t-label text-navy/50">01 / Designs</p>
          <h1 className="t-head mt-2 text-3xl uppercase">Designs</h1>
        </div>
        <Link href="/admin/work/new" className="btn btn-primary">
          + Upload new work
        </Link>
      </div>

      {drafts.length > 0 ? (
        <p className="t-data text-[11px] uppercase tracking-[0.14em] text-rust">
          ⚠ {drafts.length} draft{drafts.length === 1 ? '' : 's'} not visible on the live site
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((design) => (
          <article key={design.id} className="panel-inset overflow-hidden">
            <div
              className={`relative flex aspect-[4/3] items-center justify-center border-b-2 border-navy ${
                design.image_path ? 'bg-crt' : 'crt'
              }`}
            >
              {design.image_path ? (
                <Image
                  src={imageUrl(design.image_path) ?? ''}
                  alt=""
                  width={400}
                  height={Math.round(400 / design.ratio)}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <p className="t-data crt-text text-[10px] uppercase text-phosphor/50">
                  No signal
                </p>
              )}
              {!design.published ? (
                <span className="t-data absolute left-2 top-2 border-2 border-rust bg-rust px-1.5 py-0.5 text-[9px] uppercase text-bone">
                  Draft
                </span>
              ) : null}
            </div>

            <div className="p-3">
              <EditableMeta design={design} />

              <div className="mt-3 flex flex-wrap gap-1.5">
                <AttachImageButton id={design.id} hasImage={Boolean(design.image_path)} />
                <PublishToggle id={design.id} published={design.published} />
                <DeleteButton id={design.id} imagePath={design.image_path} title={design.title} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {designs.length === 0 ? (
        <p className="t-data text-sm text-navy/50">No work uploaded yet.</p>
      ) : null}
    </div>
  );
}
