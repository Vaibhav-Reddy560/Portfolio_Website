import Link from 'next/link';
import { notFound } from 'next/navigation';
import { imageUrl } from '@/lib/content';
import { authClient } from '@/lib/supabase/server';
import { ProjectForm, type ProjectInitial } from '../project-form';

async function getProject(id: string): Promise<ProjectInitial | null> {
  const supabase = await authClient();
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    tagline: data.tagline ?? '',
    year: data.year ?? '',
    href: data.href ?? '',
    hrefLabel: data.href_label ?? '',
    summary: data.summary ?? '',
    thesis: data.thesis ?? '',
    stack: data.stack ?? [],
    note: data.note ?? '',
    detail: data.detail ?? {},
    published: data.published,
    featured: data.featured,
    imageUrl: imageUrl(data.image_path) ?? null,
  };
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/projects" className="t-data text-[11px] uppercase text-navy/50 hover:text-navy">
        ← Projects
      </Link>
      <h1 className="t-head text-3xl uppercase">{project.name}</h1>
      <ProjectForm initial={project} />
    </div>
  );
}
