import type { PublicAnnouncement } from '@churchy/shared';
import { formatDateLong } from '@/lib/format';

export function AnnouncementItem({ announcement: a }: { announcement: PublicAnnouncement }) {
  return (
    <article className="overflow-hidden rounded-xl border border-churchy-100 bg-white">
      {a.imageUrl && (
        <img src={a.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover" />
      )}
      <div className="space-y-2 p-5">
        <p className="text-sm font-medium text-amber-600">
          <time dateTime={a.publishedAt}>{formatDateLong(a.publishedAt)}</time>
        </p>
        <h2 className="font-playfair text-xl font-semibold text-churchy-700">{a.title}</h2>
        {a.summary && <p className="font-medium text-churchy-900">{a.summary}</p>}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-churchy-900/85">{a.body}</p>
      </div>
    </article>
  );
}
