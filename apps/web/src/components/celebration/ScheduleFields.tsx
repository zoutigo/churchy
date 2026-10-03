'use client';
import { useMemo } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { WEEKDAYS, formatDateLong, formatDateShort, formatTime } from '@/lib/format';
import { DEFAULT_TIME, dateBounds, previewDraft, type ScheduleDraft } from '@/lib/schedule-draft';

interface Props {
  value: ScheduleDraft;
  onChange: (value: ScheduleDraft) => void;
  /** Fuseau de la paroisse : les heures saisies sont des heures locales de ce fuseau. */
  timezone: string;
  invalid?: boolean;
}

const MODES = [
  { mode: 'dates', label: 'Une ou plusieurs dates' },
  { mode: 'recurrence', label: 'Chaque semaine' },
] as const;

const PREVIEW_LIMIT = 6;

/**
 * Planning d'une série : dates ponctuelles ou récurrence hebdomadaire (début, fin, jours, heure).
 * Un aperçu liste les dates qui seront créées et signale tout de suite les refus de l'API
 * (date passée, au-delà d'un an).
 */
export function ScheduleFields({ value, onChange, timezone, invalid }: Props) {
  const bounds = useMemo(() => dateBounds(timezone), [timezone]);
  const preview = useMemo(() => previewDraft(value, timezone), [value, timezone]);
  const tz = { timeZone: timezone };

  const switchMode = (mode: ScheduleDraft['mode']) => {
    if (mode === value.mode) return;
    onChange(
      mode === 'dates'
        ? { mode, dates: [{ date: '', time: DEFAULT_TIME }] }
        : { mode, startDate: '', endDate: '', time: DEFAULT_TIME, weekdays: [0] },
    );
  };

  return (
    <div className="space-y-4" data-testid="schedule-fields">
      <div
        role="group"
        aria-label="Type de planning"
        className="grid grid-cols-2 gap-2 sm:inline-grid"
      >
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            aria-pressed={value.mode === m.mode}
            onClick={() => switchMode(m.mode)}
            className={cn(
              'min-h-11 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              value.mode === m.mode
                ? 'border-churchy-700 bg-churchy-700 text-white'
                : 'border-input bg-background hover:bg-accent',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {value.mode === 'dates' ? (
        <div className="space-y-3">
          {value.dates.map((d, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_auto] items-end gap-2 sm:grid-cols-[1fr_9rem_auto]"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`schedule-date-${index}`}>
                  Date{value.dates.length > 1 ? ` ${index + 1}` : ''}
                </Label>
                <Input
                  id={`schedule-date-${index}`}
                  type="date"
                  min={bounds.min}
                  max={bounds.max}
                  value={d.date}
                  aria-invalid={invalid || undefined}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      dates: value.dates.map((x, i) =>
                        i === index ? { ...x, date: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:order-none">
                <Label htmlFor={`schedule-time-${index}`}>Heure</Label>
                <Input
                  id={`schedule-time-${index}`}
                  type="time"
                  value={d.time}
                  aria-invalid={invalid || undefined}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      dates: value.dates.map((x, i) =>
                        i === index ? { ...x, time: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
              {value.dates.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="col-span-2 h-10 w-full sm:col-span-1 sm:w-10"
                  aria-label={`Retirer la date ${index + 1}`}
                  onClick={() =>
                    onChange({ ...value, dates: value.dates.filter((_, i) => i !== index) })
                  }
                >
                  <X size={18} aria-hidden />
                  <span className="ml-2 sm:hidden">Retirer</span>
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              onChange({
                ...value,
                dates: [
                  ...value.dates,
                  { date: '', time: value.dates.at(-1)?.time ?? DEFAULT_TIME },
                ],
              })
            }
          >
            <CalendarPlus size={16} aria-hidden /> Ajouter une date
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium leading-none">Jours de la semaine</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAYS.map((w) => {
                const on = value.weekdays.includes(w.value);
                return (
                  <button
                    key={w.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={w.long}
                    onClick={() =>
                      onChange({
                        ...value,
                        weekdays: on
                          ? value.weekdays.filter((x) => x !== w.value)
                          : [...value.weekdays, w.value],
                      })
                    }
                    className={cn(
                      'h-11 min-w-11 rounded-md border px-3 text-sm font-medium transition-colors',
                      on
                        ? 'border-churchy-700 bg-churchy-700 text-white'
                        : 'border-input bg-background hover:bg-accent',
                    )}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-start">Début</Label>
              <Input
                id="schedule-start"
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={value.startDate}
                aria-invalid={invalid || undefined}
                onChange={(e) => onChange({ ...value, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-end">Fin</Label>
              <Input
                id="schedule-end"
                type="date"
                min={value.startDate || bounds.min}
                max={bounds.max}
                value={value.endDate}
                aria-invalid={invalid || undefined}
                onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-time">Heure</Label>
              <Input
                id="schedule-time"
                type="time"
                value={value.time}
                aria-invalid={invalid || undefined}
                onChange={(e) => onChange({ ...value, time: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Heures de la paroisse ({timezone.replace('_', ' ')}). Une série peut être programmée jusqu’à
        un an à l’avance ; vous serez prévenu un mois avant sa fin pour la prolonger.
      </p>

      <div aria-live="polite" data-testid="schedule-preview">
        {preview.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {preview.error}
          </p>
        ) : preview.instants.length > 0 ? (
          <div className="space-y-2 rounded-md border border-churchy-200 bg-churchy-50 px-3 py-3 text-sm">
            <p className="font-medium text-churchy-700">
              {preview.instants.length === 1
                ? '1 date sera créée'
                : `${preview.instants.length} dates seront créées`}
              {preview.instants.length > 1 &&
                ` — du ${formatDateShort(preview.instants[0].toISOString(), tz)} au ${formatDateShort(
                  preview.instants.at(-1)!.toISOString(),
                  tz,
                )}`}
            </p>
            <ul className="grid gap-x-4 gap-y-1 text-muted-foreground sm:grid-cols-2">
              {preview.instants.slice(0, PREVIEW_LIMIT).map((i) => (
                <li key={i.getTime()}>
                  {formatDateLong(i.toISOString(), tz)} à {formatTime(i.toISOString(), tz)}
                </li>
              ))}
              {preview.instants.length > PREVIEW_LIMIT && (
                <li>… et {preview.instants.length - PREVIEW_LIMIT} autres</li>
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
