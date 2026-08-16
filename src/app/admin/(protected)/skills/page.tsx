import { authClient } from '@/lib/supabase/server';
import { SkillsEditor, type SkillGroupRow } from './skills-editor';

async function getRows(): Promise<SkillGroupRow[]> {
  const supabase = await authClient();
  const { data, error } = await supabase
    .from('skill_groups')
    .select('id,group_key,label,discipline,items,sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export default async function SkillsPage() {
  const rows = await getRows();

  return (
    <div className="space-y-6">
      <div>
        <p className="t-label text-navy/50">04 / Skills</p>
        <h1 className="t-head mt-2 text-3xl uppercase">Skill Groups</h1>
      </div>
      <SkillsEditor rows={rows} />
    </div>
  );
}
