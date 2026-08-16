import { authClient } from '@/lib/supabase/server';
import { EducationEditor, type EducationRow } from './education-editor';

async function getRows(): Promise<EducationRow[]> {
  const supabase = await authClient();
  const { data, error } = await supabase
    .from('education')
    .select('id,qualification,institution,period,place,is_current,sort_order')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export default async function EducationPage() {
  const rows = await getRows();

  return (
    <div className="space-y-6">
      <div>
        <p className="t-label text-navy/50">05 / Education</p>
        <h1 className="t-head mt-2 text-3xl uppercase">Education</h1>
      </div>
      <EducationEditor rows={rows} />
    </div>
  );
}
