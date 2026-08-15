import { BootSequence } from '@/components/boot-sequence';
import { EasyClub, Opacitys } from '@/components/case-studies';
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

export default function Home() {
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
          <Win id="identity" index="00" title="Identity">
            <Identity />
          </Win>

          <Win id="work" index="01" title="Selected Work">
            <Work />
          </Win>

          <Divider />

          <Win id="easy-club" index="02" title="Easy Club">
            <EasyClub />
          </Win>

          <Win id="opacitys" index="03" title="Opacitys">
            <Opacitys />
          </Win>

          <Divider />

          <Win id="personnel" index="04" title="Personnel File">
            <PersonnelFile />
          </Win>

          <Win id="service" index="05" title="Experience">
            <ServiceRecord />
          </Win>

          <Win id="capabilities" index="06" title="Skills">
            <Capabilities />
          </Win>

          <Win id="education" index="07" title="Education & Beyond">
            <EducationBeyond />
          </Win>

          <Divider />

          <Win id="transmit" index="08" title="Transmit">
            <Transmit />
          </Win>

          <Colophon />
        </main>
      </WindowProvider>

      <Diagnostics />
    </>
  );
}
