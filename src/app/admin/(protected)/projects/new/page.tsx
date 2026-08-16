import Link from 'next/link';
import { ProjectForm } from '../project-form';

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/projects" className="t-data text-[11px] uppercase text-navy/50 hover:text-navy">
        ← Projects
      </Link>
      <h1 className="t-head text-3xl uppercase">New Project</h1>
      <ProjectForm />
    </div>
  );
}
