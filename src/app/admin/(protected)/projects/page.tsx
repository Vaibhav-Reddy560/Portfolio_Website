import Link from 'next/link';
import { authClient } from '@/lib/supabase/server';
import { DeleteButton, PublishToggle } from './row-actions';

type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  year: string | null;
  image_path: string | null;
  published: boolean;
};

async function getProjects(): Promise<ProjectRow[]> {
  const supabase = await authClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id,slug,name,tagline,year,image_path,published')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  const drafts = projects.filter((p) => !p.published);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="t-label text-navy/50">02 / Projects</p>
          <h1 className="t-head mt-2 text-3xl uppercase">Build Projects</h1>
        </div>
        <Link href="/admin/projects/new" className="btn btn-primary">
          + New project
        </Link>
      </div>

      {drafts.length > 0 ? (
        <p className="t-data text-[11px] uppercase tracking-[0.14em] text-rust">
          ⚠ {drafts.length} draft{drafts.length === 1 ? '' : 's'} not visible on the live site
        </p>
      ) : null}

      <div className="space-y-3">
        {projects.map((project) => (
          <article key={project.id} className="panel-inset flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="t-head truncate text-sm uppercase leading-tight">{project.name}</p>
                {!project.published ? (
                  <span className="t-data shrink-0 border-2 border-rust bg-rust px-1.5 py-0.5 text-[9px] uppercase text-bone">
                    Draft
                  </span>
                ) : null}
              </div>
              <p className="t-data mt-1 truncate text-[10px] uppercase tracking-[0.1em] text-navy/55">
                {project.tagline ?? '—'} · {project.year ?? '—'}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Link href={`/admin/projects/${project.id}`} className="btn py-1 text-[10px]">
                Edit
              </Link>
              <PublishToggle id={project.id} published={project.published} />
              <DeleteButton id={project.id} imagePath={project.image_path} name={project.name} />
            </div>
          </article>
        ))}
      </div>

      {projects.length === 0 ? <p className="t-data text-sm text-navy/50">No projects yet.</p> : null}
    </div>
  );
}
