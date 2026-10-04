import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { Church, BookOpen } from 'lucide-react';

const QUICK_LINKS = [
  {
    key: 'myParishes',
    textKey: 'myParishesText',
    icon: Church,
    color: 'bg-churchy-200 text-churchy-700',
  },
  {
    key: 'recent',
    textKey: 'recentText',
    icon: BookOpen,
    color: 'bg-amber-500/10 text-amber-600',
  },
] as const;

export default function DashboardPage() {
  const t = useTranslations('dashboard.home');
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="border-b border-churchy-200 pb-6">
        <h1 className="font-playfair text-3xl font-bold text-churchy-700">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('welcome')}</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} href="/dashboard/parishes" className="block group">
              <div className="rounded-xl border border-churchy-200 bg-white p-6 hover:shadow-md hover:border-churchy-300 transition-all flex items-start gap-4">
                <div className={`rounded-lg p-2.5 shrink-0 ${item.color}`}>
                  <Icon size={20} strokeWidth={1.6} />
                </div>
                <div>
                  <h2 className="font-playfair font-semibold text-churchy-700 text-lg group-hover:text-churchy-500 transition-colors">
                    {t(item.key)}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{t(item.textKey)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
