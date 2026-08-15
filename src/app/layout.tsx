import type { Metadata } from 'next';
import './globals.css';
import { jura, octavus, rare } from './fonts';
import { profile } from '@/content/profile';

const SITE = 'https://vaibhavreddy.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${profile.first} ${profile.last} — ${profile.role}`,
    template: `%s — ${profile.first} ${profile.last}`,
  },
  description: profile.lede,
  keywords: [
    'Vaibhav Reddy',
    'graphic designer Bengaluru',
    'AI ML student BMSCE',
    'poster design',
    'IEEE Computer Society',
    'Easy Club',
  ],
  authors: [{ name: `${profile.first} ${profile.last}` }],
  openGraph: {
    type: 'website',
    url: SITE,
    title: `${profile.first} ${profile.last} — ${profile.role}`,
    description: profile.lede,
    siteName: `${profile.first} ${profile.last}`,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${profile.first} ${profile.last} — ${profile.role}`,
    description: profile.lede,
  },
  robots: { index: true, follow: true },
};

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: `${profile.first} ${profile.last}`,
  jobTitle: profile.role,
  email: `mailto:${profile.contact.email}`,
  url: SITE,
  sameAs: [profile.contact.linkedin, profile.contact.easyclub],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Bengaluru',
    addressCountry: 'IN',
  },
  alumniOf: {
    '@type': 'CollegeOrUniversity',
    name: 'B.M.S. College of Engineering',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${octavus.variable} ${rare.variable} ${jura.variable} h-full`}
    >
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        {children}
      </body>
    </html>
  );
}
