import Link from 'next/link';
import { NewWorkForm } from './new-form';

export default function NewWorkPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/work" className="t-data text-[11px] uppercase text-navy/50">
          ← Designs
        </Link>
        <h1 className="t-head mt-2 text-3xl uppercase">Upload work</h1>
      </div>

      <NewWorkForm />
    </div>
  );
}
