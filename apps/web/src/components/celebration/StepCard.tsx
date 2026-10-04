'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { ContentType, type Content, type SheetStepView } from '@churchy/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { DeleteButton } from '@/components/news/DeleteButton';

interface Props {
  step: SheetStepView;
  index: number;
  total: number;
  contents: Content[];
  readOnly: boolean;
  onChange: (patch: { contentId?: string | null; customText?: string | null }) => Promise<unknown>;
  onMove: (direction: -1 | 1) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/** Une étape de la feuille : contenu de la bibliothèque et/ou texte libre, ordre, retrait. */
export function StepCard({
  step,
  index,
  total,
  contents,
  readOnly,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const t = useTranslations('stepCard');
  const labels = useLabels();
  const [text, setText] = useState(step.customText ?? '');
  useEffect(() => setText(step.customText ?? ''), [step.customText]);
  const free = step.templateStepId === null;

  const byType = Object.values(ContentType)
    .map((type) => ({ type, items: contents.filter((c) => c.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <li className="space-y-3 rounded-lg border bg-white p-3 sm:p-4" data-testid="sheet-step">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            <span className="mr-2 text-muted-foreground">{index + 1}.</span>
            {step.title}
          </p>
          {free && <p className="text-xs text-muted-foreground">{t('free')}</p>}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              disabled={index === 0}
              aria-label={t('moveUp', { title: step.title })}
              onClick={() => onMove(-1)}
            >
              <ArrowUp size={16} aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              disabled={index === total - 1}
              aria-label={t('moveDown', { title: step.title })}
              onClick={() => onMove(1)}
            >
              <ArrowDown size={16} aria-hidden />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`content-${step.id}`}>{t('content')}</Label>
          <NativeSelect
            id={`content-${step.id}`}
            value={step.contentId ?? ''}
            disabled={readOnly}
            onChange={(e) => onChange({ contentId: e.target.value || null })}
          >
            <option value="">{t('noContent')}</option>
            {byType.map((g) => (
              <optgroup key={g.type} label={labels.contentType(g.type)}>
                {g.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </optgroup>
            ))}
            {step.content && !contents.some((c) => c.id === step.content!.id) && (
              <option value={step.content.id}>{step.content.title}</option>
            )}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`text-${step.id}`}>{t('customText')}</Label>
          <Textarea
            id={`text-${step.id}`}
            rows={2}
            value={text}
            disabled={readOnly}
            placeholder={t('customPlaceholder')}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text !== (step.customText ?? '')) void onChange({ customText: text || null });
            }}
          />
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <DeleteButton
            label={t('removeLabel', { title: step.title })}
            onConfirm={async () => void (await onRemove())}
          />
        </div>
      )}
    </li>
  );
}
