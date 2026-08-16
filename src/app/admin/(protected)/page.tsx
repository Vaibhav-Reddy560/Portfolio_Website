import Link from 'next/link';
import { authClient } from '@/lib/supabase/server';

async function getCounts() {
  const supabase = await authClient();

  // Authenticated RLS policy grants full read, so this sees drafts too —
  // exactly what the dashboard needs to show, unlike the public loaders.
  const [designs, publishedDesigns, projects, experience] = await Promise.all([
    supabase.from('designs').select('*', { count: 'exact', head: true }),
    supabase.from('designs').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('experience').select('*', { count: 'exact', head: true }),
  ]);

  return {
    designsTotal: designs.count ?? 0,
    designsPublished: publishedDesigns.count ?? 0,
    projects: projects.count ?? 0,
    experience: experience.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const counts = await getCounts();
  const unpublished = counts.designsTotal - counts.designsPublished;

  return (
    <div className="space-y-6">
      <div>
        <p className="t-label text-navy/50">00 / Dashboard</p>
        <h1 className="t-head mt-2 text-3xl uppercase">Control Panel</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Designs published" value={counts.designsPublished} />
        <Stat label="Drafts awaiting review" value={unpublished} accent={unpublished > 0} />
        <Stat label="Projects" value={counts.projects} />
      </div>

      <div className="panel-inset p-4">
        <p className="t-label mb-3 text-navy/50">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/work/new" className="btn btn-primary">
            + Upload new work
          </Link>
          <Link href="/admin/work" className="btn">
            Review drafts
          </Link>
          <Link href="/admin/projects" className="btn">
            Edit projects
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="panel-inset p-4">
      <p className="t-label text-navy/50">{label}</p>
      <p className={`t-head mt-2 text-3xl ${accent ? 'text-rust' : ''}`}>{value}</p>
    </div>
  );
}
