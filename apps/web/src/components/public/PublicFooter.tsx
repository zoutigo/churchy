import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';

export function PublicFooter() {
  const t = useTranslations('footer');
  const groups = [
    {
      title: t('groupChurchy'),
      links: [
        { href: '/paroisses', label: t('findParish') },
        { href: '/pour-les-paroisses', label: t('forParishes') },
        { href: '/login', label: t('login') },
      ],
    },
    {
      title: t('groupAbout'),
      links: [
        { href: '/a-propos', label: t('about') },
        { href: '/contact', label: t('contact') },
      ],
    },
    {
      title: t('groupLegal'),
      links: [
        { href: '/conditions-generales', label: t('terms') },
        { href: '/confidentialite', label: t('privacy') },
        { href: '/mentions-legales', label: t('legalNotice') },
      ],
    },
  ];
  return (
    <footer className="bg-churchy-900 text-churchy-100">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_repeat(3,1fr)] lg:px-8">
        <div className="space-y-2">
          <p className="font-playfair text-xl font-bold text-white">
            <span className="mr-2 text-amber-400" aria-hidden>
              ✦
            </span>
            Churchy
          </p>
          <p className="max-w-xs text-sm text-churchy-100/70">{t('tagline')}</p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="mb-2 text-sm font-semibold text-white">{g.title}</p>
            <ul className="space-y-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-block py-1 text-sm text-churchy-100/80 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-churchy-100/60">
        © {new Date().getFullYear()} Churchy
      </p>
    </footer>
  );
}
