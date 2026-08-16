import { imageUrl } from '@/lib/content';
import { authClient } from '@/lib/supabase/server';
import { profile as staticProfile } from '@/content/profile';
import { ProfileForm, type ProfileRowData } from './profile-form';

async function getProfileRow(): Promise<ProfileRowData> {
  const supabase = await authClient();
  const { data } = await supabase.from('profile').select('*').maybeSingle();

  if (!data) {
    return {
      first: staticProfile.first,
      last: staticProfile.last,
      eyebrow: [...staticProfile.eyebrow],
      role: staticProfile.role,
      location: staticProfile.location,
      status: staticProfile.status,
      lede: staticProfile.lede,
      about: [...staticProfile.about],
      facts: [...staticProfile.facts],
      interests: [...staticProfile.interests],
      contact: { ...staticProfile.contact, phoneParts: [...staticProfile.contact.phoneParts] },
      portraitUrl: null,
    };
  }

  return {
    first: data.first || staticProfile.first,
    last: data.last || staticProfile.last,
    eyebrow: data.eyebrow?.length ? data.eyebrow : [...staticProfile.eyebrow],
    role: data.role ?? staticProfile.role,
    location: data.location ?? staticProfile.location,
    status: data.status ?? staticProfile.status,
    lede: data.lede ?? staticProfile.lede,
    about: data.about?.length ? data.about : [...staticProfile.about],
    facts: data.facts?.length ? data.facts : [...staticProfile.facts],
    interests: data.interests?.length ? data.interests : [...staticProfile.interests],
    contact: { ...staticProfile.contact, ...(data.contact ?? {}) },
    portraitUrl: imageUrl(data.portrait_path) ?? null,
  };
}

export default async function ProfilePage() {
  const data = await getProfileRow();

  return (
    <div className="space-y-6">
      <div>
        <p className="t-label text-navy/50">06 / Profile</p>
        <h1 className="t-head mt-2 text-3xl uppercase">Operator Profile</h1>
      </div>
      <ProfileForm data={data} />
    </div>
  );
}
