'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { updateProfile } from './actions';

export type ProfileRowData = {
  first: string;
  last: string;
  eyebrow: string[];
  role: string | null;
  location: string | null;
  status: string | null;
  lede: string | null;
  about: string[];
  facts: { label: string; value: string }[];
  interests: string[];
  contact: {
    email?: string;
    phoneParts?: string[];
    linkedin?: string;
    linkedinLabel?: string;
    easyclub?: string;
    resume?: string;
  };
  portraitUrl: string | null;
};

export function ProfileForm({ data }: { data: ProfileRowData }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onFileChange = () => {
    const file = fileRef.current?.files?.[0];
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement)?.value ?? '';

  const onSave = () => {
    const fd = new FormData();
    fd.set('first', val('first'));
    fd.set('last', val('last'));
    fd.set('eyebrow', val('eyebrow'));
    fd.set('role', val('role'));
    fd.set('location', val('location'));
    fd.set('status', val('status'));
    fd.set('lede', val('lede'));
    fd.set('about', val('about'));
    fd.set('facts', val('facts'));
    fd.set('interests', val('interests'));
    fd.set('email', val('email'));
    fd.set('phone', val('phone'));
    fd.set('linkedin', val('linkedin'));
    fd.set('linkedinLabel', val('linkedinLabel'));
    fd.set('easyclub', val('easyclub'));
    fd.set('resume', val('resume'));

    const file = fileRef.current?.files?.[0];
    if (file) fd.set('portrait', file);

    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="panel-inset space-y-3 p-4">
        <p className="t-label text-navy/50">Identity</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="first" label="First name" defaultValue={data.first} />
          <Field id="last" label="Last name" defaultValue={data.last} />
        </div>
        <Field id="eyebrow" label="Eyebrow tags (comma separated)" defaultValue={data.eyebrow.join(', ')} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="role" label="Role" defaultValue={data.role ?? ''} />
          <Field id="location" label="Location" defaultValue={data.location ?? ''} />
          <Field id="status" label="Status" defaultValue={data.status ?? ''} />
        </div>
        <TextArea id="lede" label="Lede (hero thesis)" rows={2} defaultValue={data.lede ?? ''} />
      </div>

      <div className="panel-inset space-y-3 p-4">
        <p className="t-label text-navy/50">Portrait</p>
        <input
          ref={fileRef}
          id="portrait"
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="t-data block w-full text-xs file:mr-3 file:border-2 file:border-navy file:bg-bone file:px-3 file:py-1.5 file:text-[11px] file:uppercase"
        />
        <p className="t-data text-[10px] text-navy/40">
          Optional — leave empty to keep the current portrait. Re-screened to the amber halftone automatically.
        </p>
        {(preview ?? data.portraitUrl) ? (
          <div className="crt relative mt-2 flex max-h-64 items-center justify-center overflow-hidden border-2 border-navy">
            <Image
              src={preview ?? data.portraitUrl ?? ''}
              alt=""
              width={300}
              height={300}
              unoptimized
              className="max-h-64 w-auto object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className="panel-inset space-y-3 p-4">
        <p className="t-label text-navy/50">About</p>
        <TextArea
          id="about"
          label="Paragraphs — one per line. Wrap a phrase in **asterisks** for bold."
          rows={8}
          defaultValue={data.about.join('\n')}
        />
        <TextArea
          id="facts"
          label={'Facts — one "Label: Value" per line'}
          rows={4}
          defaultValue={data.facts.map((f) => `${f.label}: ${f.value}`).join('\n')}
        />
        <Field id="interests" label="Interests (comma separated)" defaultValue={data.interests.join(', ')} />
      </div>

      <div className="panel-inset space-y-3 p-4">
        <p className="t-label text-navy/50">Contact</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="email" label="Email" defaultValue={data.contact.email ?? ''} />
          <Field id="phone" label="Phone" defaultValue={(data.contact.phoneParts ?? []).join('')} />
          <Field id="linkedin" label="LinkedIn URL" defaultValue={data.contact.linkedin ?? ''} />
          <Field id="linkedinLabel" label="LinkedIn label" defaultValue={data.contact.linkedinLabel ?? ''} />
          <Field id="easyclub" label="Product URL" defaultValue={data.contact.easyclub ?? ''} />
          <Field id="resume" label="Resume path/URL" defaultValue={data.contact.resume ?? ''} />
        </div>
      </div>

      {error ? (
        <p className="t-data text-[11px] uppercase text-rust" role="alert">
          ⚠ {error}
        </p>
      ) : null}
      {saved ? (
        <p className="t-data text-[11px] uppercase text-navy/50">Saved — live on the site now.</p>
      ) : null}

      <button type="button" disabled={pending} onClick={onSave} className="btn btn-primary">
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}

function Field({ id, label, defaultValue }: { id: string; label: string; defaultValue?: string }) {
  return (
    <div>
      <label className="t-label mb-1 block text-navy/60" htmlFor={id}>
        {label}
      </label>
      <input id={id} type="text" defaultValue={defaultValue} className="w-full border-2 border-navy/25 bg-bone p-2 text-sm" />
    </div>
  );
}

function TextArea({
  id,
  label,
  rows,
  defaultValue,
}: {
  id: string;
  label: string;
  rows: number;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="t-label mb-1 block text-navy/60" htmlFor={id}>
        {label}
      </label>
      <textarea id={id} rows={rows} defaultValue={defaultValue} className="w-full border-2 border-navy/25 bg-bone p-2 text-sm" />
    </div>
  );
}
