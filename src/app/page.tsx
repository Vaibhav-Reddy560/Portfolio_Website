import type { ReactNode } from 'react';
import { BootSequence } from '@/components/boot-sequence';
import { CaseStudy } from '@/components/case-study';
import { Diagnostics } from '@/components/diagnostics';
import { Identity } from '@/components/identity';
import {
  Capabilities,
  Colophon,
  EducationBeyond,
  PersonnelFile,
  ServiceRecord,
  Transmit,
} from '@/components/sections';
import { Win, WindowProvider } from '@/components/window-system';
import { Work } from '@/components/work';
import { Ornament } from '@/components/y2k';
import {
  getAdditionalRoles,
  getBuilds,
  getCaseStudies,
  getDesigns,
  getEducation,
  getExperience,
  getProfile,
  getSkillGroups,
} from '@/lib/content';

/** Chrome ornament used to separate the major runs of windows. */
function Divider() {
  return (
    <div aria-hidden className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-bone/25" />
      <Ornament className="h-6 w-40 text-bone/45" />
      <span className="h-px flex-1 bg-bone/25" />
    </div>
  );
}

type Section = { id: string; title: string; node: ReactNode };

export default async function Home() {
  // All loaders are cached and tagged, so the page still prerenders. Fetched in
  // parallel because none of them depend on each other.
  const [
    profile,
    designs,
    builds,
    caseStudies,
    roles,
    additionalRoles,
    skillGroups,
    education,
  ] = await Promise.all([
    getProfile(),
    getDesigns(),
    getBuilds(),
    getCaseStudies(),
    getExperience(),
    getAdditionalRoles(),
    getSkillGroups(),
    getEducation(),
  ]);

  // Case studies are however many featured projects exist today, not a fixed
  // pair — everything downstream (window indices, the diagnostics scroll-spy
  // module list) is derived from this, so publishing a new featured project
  // never needs a code change here.
  const lead: Section[] = [
    { id: 'identity', title: 'Identity', node: <Identity data={profile} /> },
    { id: 'work', title: 'Selected Work', node: <Work designs={designs} builds={builds} /> },
  ];
  const studies: Section[] = caseStudies.map((cs) => ({
    id: cs.slug,
    title: cs.name,
    node: <CaseStudy data={cs} />,
  }));
  const resume: Section[] = [
    { id: 'personnel', title: 'Personnel File', node: <PersonnelFile data={profile} /> },
    { id: 'service', title: 'Experience', node: <ServiceRecord roles={roles} /> },
    { id: 'capabilities', title: 'Skills', node: <Capabilities groups={skillGroups} /> },
    {
      id: 'education',
      title: 'Education & Beyond',
      node: <EducationBeyond entries={education} roles={additionalRoles} data={profile} />,
    },
  ];
  const contact: Section[] = [
    { id: 'transmit', title: 'Contact', node: <Transmit data={profile} /> },
  ];

  const ordered = [...lead, ...studies, ...resume, ...contact];
  const diagnosticsModules = ordered.map(
    (s) => [s.id, s.title.toUpperCase()] as const,
  );

  let cursor = 0;
  const nextIndex = () => String(cursor++).padStart(2, '0');

  return (
    <>
      <BootSequence />

      <WindowProvider>
        <a
          href="#work"
          className="btn sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[500]"
        >
          Skip to work
        </a>

        <main className="shell space-y-6 py-6 pb-24 sm:space-y-8 sm:py-10">
          {lead.map((s) => (
            <Win key={s.id} id={s.id} index={nextIndex()} title={s.title}>
              {s.node}
            </Win>
          ))}

          <Divider />

          {studies.map((s) => (
            <Win key={s.id} id={s.id} index={nextIndex()} title={s.title}>
              {s.node}
            </Win>
          ))}

          <Divider />

          {resume.map((s) => (
            <Win key={s.id} id={s.id} index={nextIndex()} title={s.title}>
              {s.node}
            </Win>
          ))}

          <Divider />

          {contact.map((s) => (
            <Win key={s.id} id={s.id} index={nextIndex()} title={s.title}>
              {s.node}
            </Win>
          ))}

          <Colophon data={profile} />
        </main>
      </WindowProvider>

      <Diagnostics modules={diagnosticsModules} />
    </>
  );
}
