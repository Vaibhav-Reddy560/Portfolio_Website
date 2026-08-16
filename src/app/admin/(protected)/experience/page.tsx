import { authClient } from '@/lib/supabase/server';
import { ExperienceEditor, type ExperienceRow } from './experience-editor';

async function getRows(): Promise<ExperienceRow[]> {
  const supabase = await authClient();
  const { data, error } = await supabase
    .from('experience')
    .select('id,title,org,sub,start_label,end_label,detail,tags,is_additional,published,sort_order')
    .order('sort_order', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export default async function ExperiencePage() {
  const rows = await getRows();
  const main = rows.filter((r) => !r.is_additional);
  const additional = rows.filter((r) => r.is_additional);

  return (
    <div className="space-y-8">
      <div>
        <p className="t-label text-navy/50">03 / Experience</p>
        <h1 className="t-head mt-2 text-3xl uppercase">Experience</h1>
      </div>

      <section className="space-y-3">
        <h2 className="t-label text-navy/50">Roles</h2>
        <ExperienceEditor rows={main} isAdditional={false} />
      </section>

      <section className="space-y-3">
        <h2 className="t-label text-navy/50">Also involved in</h2>
        <ExperienceEditor rows={additional} isAdditional={true} />
      </section>
    </div>
  );
}
