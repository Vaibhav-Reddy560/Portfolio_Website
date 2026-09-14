import { getFaceStatus } from './status';
import { FaceEnrollment } from './face-enrollment';

export default async function SecurityPage() {
  const { enrolled, enrolledAt, viewCount } = await getFaceStatus();

  return (
    <div className="space-y-6">
      <div>
        <p className="t-label text-navy/50">07 / Security</p>
        <h1 className="t-head mt-2 text-3xl uppercase">Access Control</h1>
      </div>
      <FaceEnrollment enrolled={enrolled} enrolledAt={enrolledAt} viewCount={viewCount} />
    </div>
  );
}
