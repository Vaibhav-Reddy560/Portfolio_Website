'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  additionalRoles as staticAdditional,
  experience as staticExperience,
  type Role,
} from '@/content/experience';
import { profile as staticProfile } from '@/content/profile';
import {
  education as staticEducation,
  skillGroups as staticSkillGroups,
} from '@/content/skills';
import { Barcode, Led, Rivets, SerialPlate, Vents } from './hardware';
import { Checker, Ornament, Starburst } from './y2k';

/**
 * Every section takes its content as an optional prop, defaulting to the static
 * file. The server passes Supabase-backed data in; the defaults keep these
 * components renderable standalone and safe if a loader returns nothing.
 */
type ProfileData = typeof staticProfile & { portrait?: string };

/** Scroll reveal. Motion rather than a CSS view() timeline, which Firefox still lacks. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.9, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Small CRT strip used as a section sub-header inside bone panels. */
function Strip({ children }: { children: ReactNode }) {
  return (
    <div className="crt border-2 border-navy px-3 py-1.5">
      <p className="t-label crt-text relative z-10 text-phosphor">{children}</p>
    </div>
  );
}

/* ================================================================= */

/**
 * Splits on `**bold**` markers and renders the emphasised runs in Jura's own
 * DemiBold weight — not literal Unicode "mathematical bold" characters, which
 * Jura has no glyphs for and which silently fall back to a mismatched system
 * serif font wherever they appear.
 */
function renderEmphasis(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-navy">
        {chunk}
      </strong>
    ) : (
      chunk
    ),
  );
}

export function PersonnelFile({ data = staticProfile }: { data?: ProfileData } = {}) {
  const profile = data;
  const paragraphs = profile.about.slice(0, -1);
  const signature = profile.about.at(-1) ?? '';

  return (
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Reveal>
          <ul className="mb-5 flex flex-wrap gap-1.5">
            {profile.eyebrow.map((tag) => (
              <li
                key={tag}
                className="t-data border-2 border-navy/25 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-navy/60"
              >
                {tag}
              </li>
            ))}
          </ul>
        </Reveal>

        {paragraphs.map((paragraph, i) => (
          <Reveal key={paragraph.slice(0, 20)} delay={i * 0.06}>
            <p
              className={
                i === 0
                  ? 'text-pretty text-lg leading-relaxed text-navy'
                  : 'mt-4 text-pretty leading-relaxed text-navy/75'
              }
            >
              {renderEmphasis(paragraph)}
            </p>
          </Reveal>
        ))}

        {/* Closing line, stamped rather than run in as a seventh paragraph —
            a personnel file's sign-off reads like a seal, not more body copy. */}
        <Reveal delay={paragraphs.length * 0.06 + 0.06}>
          <div className="mt-8 inline-block -rotate-2 border-4 border-double border-rust/70 px-5 py-3">
            <p className="t-head text-pretty text-xl uppercase leading-tight tracking-wide text-rust sm:text-2xl">
              {signature}
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.1} className="lg:col-span-5">
        {/* Operator ID card — amber halftone plate, baked by scripts/build-portrait.mjs */}
        <figure className="panel-inset relative mb-4 overflow-hidden">
          <Rivets />
          <figcaption className="flex items-center justify-between gap-2 border-b-2 border-navy bg-bone-dk px-2 py-1">
            <span className="t-label text-[9px]">Operator // ID-2026</span>
            <Led tone="rust" />
          </figcaption>

          <div className="crt relative">
            <Image
              src={profile.portrait ?? '/portrait-amber.webp'}
              alt={`${profile.first} ${profile.last}`}
              width={620}
              height={694}
              priority={false}
              sizes="(max-width: 64rem) 100vw, 33vw"
              className="w-full"
            />
            {(
              [
                'left-2 top-2 border-l-2 border-t-2',
                'right-2 top-2 border-r-2 border-t-2',
                'left-2 bottom-2 border-b-2 border-l-2',
                'right-2 bottom-2 border-b-2 border-r-2',
              ] as const
            ).map((pos) => (
              <span
                key={pos}
                aria-hidden
                className={`absolute z-10 h-4 w-4 border-phosphor/60 ${pos}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t-2 border-navy px-2 py-1">
            <span className="t-data text-[9px] uppercase tracking-[0.16em] text-navy/50">
              Bengaluru, IN
            </span>
            <Barcode label="vaibhavreddy" className="h-3.5" />
          </div>
        </figure>

        <dl className="panel-inset divide-y-2 divide-navy/15">
          {profile.facts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
              <dt className="t-label text-navy/60">{fact.label}</dt>
              <dd className="t-data text-right text-xs">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </div>
  );
}

/* ================================================================= */

export function ServiceRecord({
  roles: input = staticExperience,
}: { roles?: Role[] } = {}) {
  const roles = [...input].sort((a, b) => b.order - a.order);

  return (
    <div className="p-4 sm:p-6">
      <ol className="space-y-2">
        {roles.map((role, i) => (
          <li key={`${role.title}-${role.start}`}>
            <Reveal delay={Math.min(i * 0.04, 0.2)}>
              <article className="panel-inset grid gap-2 p-3.5 lg:grid-cols-12 lg:gap-4">
                <div className="lg:col-span-3">
                  <p className="t-data text-[11px] uppercase text-rust">
                    {role.start}
                    <span className="text-navy/35"> → </span>
                    {role.end}
                  </p>
                  {role.end === 'Present' ? (
                    <span className="t-data mt-1 inline-block bg-rust px-1.5 py-0.5 text-[9px] uppercase text-bone">
                      Active
                    </span>
                  ) : null}
                </div>

                <div className="lg:col-span-6">
                  <h3 className="t-head text-base uppercase leading-tight">{role.title}</h3>
                  <p className="t-data mt-1 text-[10px] uppercase tracking-[0.12em] text-navy/60">
                    {role.org}
                    {role.sub ? <span className="text-navy/35"> · {role.sub}</span> : null}
                  </p>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-navy/75">
                    {role.detail}
                  </p>
                </div>

                <ul className="flex flex-wrap gap-1.5 self-start lg:col-span-3 lg:justify-end">
                  {role.tags.map((tag) => (
                    <li
                      key={tag}
                      className="t-data h-fit border border-navy/30 px-1.5 py-0.5 text-[9px] uppercase"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ================================================================= */

export function Capabilities({
  groups = staticSkillGroups,
}: { groups?: typeof staticSkillGroups } = {}) {
  const skillGroups = groups;
  return (
    <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-3">
      {skillGroups.map((group, i) => (
        <Reveal key={group.id} delay={i * 0.06}>
          <div className="panel-inset h-full">
            <Strip>{group.label}</Strip>
            <ul className="space-y-1.5 p-3">
              {group.items.map((item) => (
                <li key={item} className="flex items-baseline gap-2 text-sm">
                  <span aria-hidden className="text-rust">
                    ▸
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* ================================================================= */

export function EducationBeyond({
  entries = staticEducation,
  roles = staticAdditional,
  data = staticProfile,
}: {
  entries?: typeof staticEducation;
  roles?: typeof staticAdditional;
  data?: ProfileData;
} = {}) {
  const education = entries;
  const additionalRoles = roles;
  const profile = data;
  return (
    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Strip>Education</Strip>
        <ol className="mt-3 space-y-2">
          {education.map((entry, i) => (
            <li key={entry.institution}>
              <Reveal delay={i * 0.05}>
                <div className="panel-inset flex flex-wrap items-baseline justify-between gap-2 p-3">
                  <div>
                    <h3 className="t-head text-sm uppercase leading-tight">
                      {entry.qualification}
                    </h3>
                    <p className="mt-1 text-xs text-navy/70">
                      {entry.institution}
                      <span className="text-navy/40"> · {entry.place}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.current ? (
                      <span className="t-data bg-rust px-1.5 py-0.5 text-[9px] uppercase text-bone">
                        Current
                      </span>
                    ) : null}
                    <span className="t-data text-[10px] uppercase text-navy/60">
                      {entry.period}
                    </span>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      <div className="lg:col-span-5">
        <Reveal>
          <Strip>Also involved in</Strip>
          <ul className="mt-3 space-y-2">
            {additionalRoles.map((entry) => (
              <li key={entry.role} className="text-xs leading-relaxed">
                <span className="t-data uppercase tracking-[0.1em] text-navy">{entry.role}</span>
                <span className="text-navy/60"> — {entry.org}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-5">
            <Strip>Interests</Strip>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <li
                  key={interest}
                  className="t-data border-2 border-navy/25 px-2 py-1 text-[10px] uppercase"
                >
                  {interest}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ================================================================= */

export function Transmit({ data = staticProfile }: { data?: ProfileData } = {}) {
  const contact = data.contact;
  return (
    <div className="p-4 sm:p-6">
      <div className="crt relative border-2 border-navy p-5 sm:p-8">
        <div className="relative z-10">
          <p className="t-label crt-text text-phosphor/70">Outbound channel open</p>
          <h3 className="t-head crt-text mt-3 text-3xl uppercase text-phosphor sm:text-5xl">
            Let&rsquo;s make
            <br />
            something good.
          </h3>
          <p className="crt-text mt-4 max-w-lg text-pretty text-sm leading-relaxed text-phosphor/70">
            Open to design work, internships and product builds. The fastest way to reach me is
            email.
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="crt-text mt-5 inline-block border-b-2 border-phosphor/50 pb-1 text-base text-phosphor transition-colors hover:border-phosphor sm:text-xl"
          >
            {contact.email} →
          </a>
        </div>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Channel label="Phone">
          <ObfuscatedPhone parts={contact.phoneParts} />
        </Channel>
        <Channel label="LinkedIn">
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-xs hover:text-rust"
          >
            {contact.linkedinLabel} ↗
          </a>
        </Channel>
        <Channel label="Product">
          <a
            href={contact.easyclub}
            target="_blank"
            rel="noreferrer"
            className="text-xs hover:text-rust"
          >
            easyclub.in ↗
          </a>
        </Channel>
        <Channel label="Résumé">
          <a href={contact.resume} className="text-xs hover:text-rust">
            Download PDF ↓
          </a>
        </Channel>
      </dl>
    </div>
  );
}

function Channel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="panel-inset p-3">
      <dt className="t-label text-navy/55">{label}</dt>
      <dd className="t-data mt-1.5">{children}</dd>
    </div>
  );
}

/**
 * Public by choice, but assembled on the client so the literal string never
 * appears in the served HTML that scrapers read.
 */
function ObfuscatedPhone({ parts }: { parts: readonly string[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const number = parts.join('');
  if (!ready) return <span className="text-xs text-navy/40">…</span>;

  return (
    <a href={`tel:${number.replace(/\s/g, '')}`} className="text-xs hover:text-rust">
      {number}
    </a>
  );
}

/* ================================================================= */

export function Colophon({ data = staticProfile }: { data?: ProfileData } = {}) {
  const profile = data;
  return (
    <footer className="panel relative mt-6 sm:mt-8">
      <Rivets />
      <div className="hazard h-2.5 border-b-2 border-navy" />
      <Checker className="opacity-40" />
      <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="t-label text-navy/60">Colophon</p>
          <p className="mt-3 max-w-sm text-pretty text-xs leading-relaxed text-navy/75">
            Set in Octavus Black, YFF Rare Trial Power Black and Jura. Built with Next.js,
            Tailwind CSS and Motion. Every window can be dragged, minimised and closed.
          </p>
        </div>

        <div className="lg:col-span-4">
          <p className="t-label text-navy/60">Palette</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {[
              ['#3E6CA0', 'blueprint'],
              ['#EDE6D6', 'bone'],
              ['#14142A', 'navy'],
              ['#E8A33C', 'amber'],
              ['#C1462F', 'rust'],
              ['#F0A030', 'phosphor'],
            ].map(([hex, name]) => (
              <li key={hex} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-4 w-4 border-2 border-navy"
                  style={{ backgroundColor: hex }}
                />
                <span className="t-data text-[9px] uppercase text-navy/60">{name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between gap-3 lg:col-span-3 lg:items-end">
          <div className="flex items-center gap-2">
            <Starburst aria-hidden className="h-3 w-3 text-rust" />
            <p className="t-data text-[10px] uppercase tracking-[0.14em] text-navy/60">
              {profile.location}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Vents className="h-4 w-10" />
            <SerialPlate id="VR-2026-FIN" />
          </div>
          <p className="t-data text-[10px] text-navy/40">
            © {new Date().getFullYear()} {profile.first} {profile.last}
          </p>
        </div>
      </div>
    </footer>
  );
}
