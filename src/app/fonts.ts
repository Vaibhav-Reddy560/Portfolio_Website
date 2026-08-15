import localFont from 'next/font/local';

/**
 * Three faces, supplied by Vaibhav. The division of labour is fixed:
 * Octavus is the name and nothing else, YFF Rare Trial carries headlines,
 * Jura does all remaining text including the terminal readouts.
 */

export const octavus = localFont({
  src: '../../public/octavus/Octavus-Black-FFP.ttf',
  variable: '--font-octavus',
  display: 'swap',
  weight: '900',
});

export const rare = localFont({
  src: '../../public/YFFRARETRIAL-PowerBlack.otf',
  variable: '--font-rare',
  display: 'swap',
  weight: '900',
});

export const jura = localFont({
  variable: '--font-jura',
  display: 'swap',
  src: [
    { path: '../../public/jura/JuraLight.ttf', weight: '300', style: 'normal' },
    { path: '../../public/jura/JuraBook.ttf', weight: '400', style: 'normal' },
    { path: '../../public/jura/JuraMedium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/jura/JuraDemiBold.ttf', weight: '600', style: 'normal' },
  ],
});
