import { ImageResponse } from 'next/og';

/** Image d'aperçu des liens partagés (WhatsApp, Facebook, X…) : 1200×630, logo Churchy sur fond crème. */
export const alt = 'Churchy — Préparer. Célébrer. Unir.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GREEN = '#1F3B28';
const GOLD = '#D4893A';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        background: '#FAF6EC',
        color: GREEN,
      }}
    >
      {/* Fenêtre en ogive + croix : la marque */}
      <svg width="250" height="330" viewBox="0 0 250 330">
        <path d="M0 330 V130 C0 60 70 10 125 0 C180 10 250 60 250 130 V330 Z" fill={GREEN} />
        <rect x="105" y="60" width="40" height="220" fill={GOLD} />
        <rect x="55" y="105" width="140" height="38" fill={GOLD} />
        <path d="M40 330 L125 250 L210 330 Z" fill={GOLD} />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: -2 }}>
          Churchy
        </div>
        <div style={{ display: 'flex', fontSize: 40, marginTop: 24, fontWeight: 600 }}>
          <span>Préparer</span>
          <span style={{ color: GOLD }}>.</span>
          <span style={{ marginLeft: 14 }}>Célébrer</span>
          <span style={{ color: GOLD }}>.</span>
          <span style={{ marginLeft: 14 }}>Unir</span>
          <span style={{ color: GOLD }}>.</span>
        </div>
        <div style={{ fontSize: 30, marginTop: 40, opacity: 0.75 }}>
          Les messes et annonces de votre paroisse
        </div>
      </div>
    </div>,
    size,
  );
}
