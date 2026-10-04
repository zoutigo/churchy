'use client';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreHorizontal,
  Palette,
  Quote,
  Redo2,
  Minus,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { toRichHtml } from '@churchy/shared';
import { cn } from '@/lib/utils';
import { ImageError, imageFileToDataUrl, isSupportedImage } from '@/lib/rich-text/image';

const TEXT_COLORS = ['#1F3B28', '#2A1F0E', '#B8722E', '#B91C1C', '#1D4ED8', '#6B7280'];
const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BAE6FD', '#FBCFE8', '#FED7AA'];
const IMAGE_WIDTHS = ['25', '50', '75', '100'];

/** Image inline avec une largeur choisie (25/50/75/100 %), stockée en `data-width`. */
const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      dataWidth: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-width'),
        renderHTML: (attrs: { dataWidth?: string | null }) =>
          attrs.dataWidth ? { 'data-width': attrs.dataWidth } : {},
      },
    };
  },
});

export interface RichTextEditorProps {
  /** HTML (ou ancien texte brut). */
  value: string;
  /** Reçoit le HTML, ou '' si le document est vide. */
  onChange: (html: string) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  /** Autorise les images inline (bouton, collage, glisser-déposer). */
  allowImages?: boolean;
  /** Hauteur minimale de la zone de saisie (champ court, ex. « 8rem ») ; par défaut 14/22/26 rem. */
  minHeight?: string;
  invalid?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

type Panel = null | 'link' | 'color' | 'highlight';

function ToolButton({
  label,
  onClick,
  active,
  disabled,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Garde le focus (et la sélection) dans l'éditeur.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-35 md:h-8 md:w-8',
        active && 'bg-primary/15 text-primary',
        className,
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border" />;

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  id,
  placeholder: placeholderProp,
  allowImages = false,
  minHeight,
  invalid,
  disabled,
  'aria-label': ariaLabel,
}: RichTextEditorProps) {
  const t = useTranslations('richText');
  const placeholder = placeholderProp ?? t('placeholder');
  const [panel, setPanel] = useState<Panel>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const editorRef = useRef<Editor | null>(null);

  const insertImages = useCallback(
    async (files: File[]) => {
      const images = files.filter(isSupportedImage);
      if (images.length === 0) return;
      setImageError(null);
      for (const file of images) {
        try {
          const src = await imageFileToDataUrl(file);
          editorRef.current
            ?.chain()
            .focus()
            .setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') })
            .run();
        } catch (err) {
          setImageError(err instanceof ImageError ? t(`imageErrors.${err.code}`) : t('imageFail'));
        }
      }
    },
    [t],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    content: toRichHtml(value),
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      ...(allowImages ? [RichImage.configure({ inline: true, allowBase64: true })] : []),
    ],
    editorProps: {
      attributes: {
        class: 'rich-content px-3 py-3 md:px-4',
        ...(id ? { id } : {}),
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!allowImages || !files.some(isSupportedImage)) return false;
        void insertImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!allowImages || !files.some(isSupportedImage)) return false;
        void insertImages(files);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      // Le paragraphe vide final (ajouté pour pouvoir écrire après un tableau/une image) n'est pas stocké.
      const html = e.isEmpty ? '' : e.getHTML().replace(/(<p><\/p>)+$/, '');
      lastEmitted.current = html;
      onChange(html);
    },
    onBlur: () => onBlur?.(),
  });
  editorRef.current = editor;

  // Valeur modifiée de l'extérieur (reset du formulaire, chargement) : on resynchronise.
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(toRichHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return <div className="min-h-[14rem] rounded-md border border-input bg-background" aria-busy />;
  }

  const run = (fn: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) =>
    fn(editor.chain().focus()).run();

  const heading = editor.isActive('heading', { level: 2 })
    ? 'h2'
    : editor.isActive('heading', { level: 3 })
      ? 'h3'
      : 'p';

  function openLink() {
    if (panel === 'link') return setPanel(null);
    setLinkUrl((editor!.getAttributes('link').href as string | undefined) ?? '');
    setPanel('link');
  }
  function applyLink() {
    const url = linkUrl.trim();
    if (!url) return removeLink();
    const href = /^(https?:\/\/|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
    run((c) => c.extendMarkRange('link').setLink({ href }));
    setPanel(null);
  }
  function removeLink() {
    run((c) => c.extendMarkRange('link').unsetLink());
    setPanel(null);
  }

  const inTable = editor.isActive('table');
  const imageActive = allowImages && editor.isActive('image');
  const textButton = (
    label: string,
    icon: ReactNode,
    action: () => void,
    active?: boolean,
    disabled?: boolean,
  ) => (
    <ToolButton label={label} onClick={action} active={active} disabled={disabled}>
      {icon}
    </ToolButton>
  );
  const ic = 'h-[18px] w-[18px]';

  const secondaryRow = (
    <>
      {textButton(
        t('strike'),
        <Strikethrough className={ic} />,
        () => run((c) => c.toggleStrike()),
        editor.isActive('strike'),
      )}
      {textButton(
        t('superscript'),
        <SuperscriptIcon className={ic} />,
        () => run((c) => c.toggleSuperscript()),
        editor.isActive('superscript'),
      )}
      {textButton(
        t('subscript'),
        <SubscriptIcon className={ic} />,
        () => run((c) => c.toggleSubscript()),
        editor.isActive('subscript'),
      )}
      <Sep />
      {textButton(
        t('textColor'),
        <Palette className={ic} />,
        () => setPanel(panel === 'color' ? null : 'color'),
        panel === 'color',
      )}
      {textButton(
        t('highlight'),
        <Highlighter className={ic} />,
        () => setPanel(panel === 'highlight' ? null : 'highlight'),
        panel === 'highlight',
      )}
      <Sep />
      {textButton(
        t('alignLeft'),
        <AlignLeft className={ic} />,
        () => run((c) => c.setTextAlign('left')),
        editor.isActive({ textAlign: 'left' }),
      )}
      {textButton(
        t('center'),
        <AlignCenter className={ic} />,
        () => run((c) => c.setTextAlign('center')),
        editor.isActive({ textAlign: 'center' }),
      )}
      {textButton(
        t('alignRight'),
        <AlignRight className={ic} />,
        () => run((c) => c.setTextAlign('right')),
        editor.isActive({ textAlign: 'right' }),
      )}
      {textButton(
        t('justify'),
        <AlignJustify className={ic} />,
        () => run((c) => c.setTextAlign('justify')),
        editor.isActive({ textAlign: 'justify' }),
      )}
      <Sep />
      {textButton(
        t('quote'),
        <Quote className={ic} />,
        () => run((c) => c.toggleBlockquote()),
        editor.isActive('blockquote'),
      )}
      {textButton(t('separator'), <Minus className={ic} />, () =>
        run((c) => c.setHorizontalRule()),
      )}
      {textButton(
        t('insertTable'),
        <TableIcon className={ic} />,
        () => run((c) => c.insertTable({ rows: 3, cols: 2, withHeaderRow: true })),
        inTable,
      )}
      {textButton('Effacer la mise en forme', <Eraser className={ic} />, () =>
        run((c) => c.unsetAllMarks().clearNodes()),
      )}
    </>
  );

  const swatches = (
    colors: string[],
    onPick: (c: string) => void,
    onClear: () => void,
    clearLabel: string,
  ) => (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={t('colourSwatch', { c })}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onPick(c);
            setPanel(null);
          }}
          className="h-8 w-8 rounded-full border border-border ring-offset-2 hover:ring-2 hover:ring-ring"
          style={{ backgroundColor: c }}
        />
      ))}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onClear();
          setPanel(null);
        }}
        className="h-8 rounded-md border border-border px-2 text-xs hover:bg-secondary"
      >
        {clearLabel}
      </button>
    </div>
  );

  return (
    <div
      data-testid="rich-text-editor"
      aria-invalid={invalid || undefined}
      style={minHeight ? ({ '--editor-min-height': minHeight } as CSSProperties) : undefined}
      className={cn(
        'rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        invalid && 'border-destructive focus-within:ring-destructive',
        disabled && 'opacity-60',
      )}
    >
      <div className="sticky top-0 z-10 rounded-t-md border-b bg-card">
        <div
          role="toolbar"
          aria-label={t('toolbar')}
          className="flex flex-col md:flex-row md:flex-wrap md:items-center md:px-1.5 md:py-1"
        >
          <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 md:p-0">
            {textButton(
              t('undo'),
              <Undo2 className={ic} />,
              () => run((c) => c.undo()),
              false,
              !editor.can().undo(),
            )}
            {textButton(
              t('redo'),
              <Redo2 className={ic} />,
              () => run((c) => c.redo()),
              false,
              !editor.can().redo(),
            )}
            <Sep />
            <select
              aria-label={t('paragraphStyle')}
              value={heading}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'p') run((c) => c.setParagraph());
                else run((c) => c.setHeading({ level: v === 'h2' ? 2 : 3 }));
              }}
              className="h-10 shrink-0 rounded-md border border-input bg-background px-2 text-sm md:h-8"
            >
              <option value="p">{t('paragraph')}</option>
              <option value="h2">{t('heading')}</option>
              <option value="h3">{t('subheading')}</option>
            </select>
            <Sep />
            {textButton(
              t('bold'),
              <Bold className={ic} />,
              () => run((c) => c.toggleBold()),
              editor.isActive('bold'),
            )}
            {textButton(
              t('italic'),
              <Italic className={ic} />,
              () => run((c) => c.toggleItalic()),
              editor.isActive('italic'),
            )}
            {textButton(
              t('underline'),
              <UnderlineIcon className={ic} />,
              () => run((c) => c.toggleUnderline()),
              editor.isActive('underline'),
            )}
            <Sep />
            {textButton(
              t('bullets'),
              <List className={ic} />,
              () => run((c) => c.toggleBulletList()),
              editor.isActive('bulletList'),
            )}
            {textButton(
              t('numbered'),
              <ListOrdered className={ic} />,
              () => run((c) => c.toggleOrderedList()),
              editor.isActive('orderedList'),
            )}
            {textButton(
              t('link'),
              <Link2 className={ic} />,
              openLink,
              editor.isActive('link') || panel === 'link',
            )}
            {allowImages &&
              textButton(t('insertImage'), <ImagePlus className={ic} />, () =>
                fileInput.current?.click(),
              )}
            <ToolButton
              label={moreOpen ? t('lessOptions') : t('moreOptions')}
              onClick={() => setMoreOpen(!moreOpen)}
              active={moreOpen}
              className="md:hidden"
            >
              <MoreHorizontal className={ic} />
            </ToolButton>
          </div>
          <div
            className={cn(
              'flex-wrap items-center gap-0.5 border-t px-1.5 py-1 md:flex md:border-0 md:p-0',
              moreOpen ? 'flex' : 'hidden',
            )}
          >
            {secondaryRow}
          </div>
        </div>

        {panel === 'link' && (
          <form
            className="flex flex-wrap items-center gap-2 border-t px-2 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            <input
              type="text"
              inputMode="url"
              autoFocus
              aria-label={t('linkAddress')}
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base md:h-8 md:text-sm"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-3 text-sm text-primary-foreground md:h-8"
            >
              {t('apply')}
            </button>
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={removeLink}
                className="h-10 rounded-md border px-3 text-sm md:h-8"
              >
                {t('remove')}
              </button>
            )}
          </form>
        )}
        {panel === 'color' && (
          <div className="border-t px-2 py-2">
            {swatches(
              TEXT_COLORS,
              (c) => run((ch) => ch.setColor(c)),
              () => run((ch) => ch.unsetColor()),
              t('default'),
            )}
          </div>
        )}
        {panel === 'highlight' && (
          <div className="border-t px-2 py-2">
            {swatches(
              HIGHLIGHT_COLORS,
              (c) => run((ch) => ch.setHighlight({ color: c })),
              () => run((ch) => ch.unsetHighlight()),
              t('none'),
            )}
          </div>
        )}
        {inTable && (
          <div
            className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5 text-xs"
            aria-label={t('table')}
          >
            {(
              [
                [t('rowAdd'), () => run((c) => c.addRowAfter())],
                [t('rowDelete'), () => run((c) => c.deleteRow())],
                [t('columnAdd'), () => run((c) => c.addColumnAfter())],
                [t('columnDelete'), () => run((c) => c.deleteColumn())],
                [t('deleteTable'), () => run((c) => c.deleteTable())],
              ] as const
            ).map(([label, action]) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={action}
                className="h-8 rounded-md border px-2 hover:bg-secondary"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {imageActive && (
          <div
            className="flex flex-wrap items-center gap-1 border-t px-2 py-1.5 text-xs"
            aria-label={t('image')}
          >
            <span className="text-muted-foreground">Largeur</span>
            {IMAGE_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={editor.getAttributes('image').dataWidth === w}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run((c) => c.updateAttributes('image', { dataWidth: w }))}
                className={cn(
                  'h-8 rounded-md border px-2 hover:bg-secondary',
                  editor.getAttributes('image').dataWidth === w && 'bg-primary/15 text-primary',
                )}
              >
                {w} %
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run((c) => c.deleteSelection())}
              className="h-8 rounded-md border border-destructive/40 px-2 text-destructive hover:bg-destructive/10"
            >
              {t('deleteImage')}
            </button>
          </div>
        )}
      </div>

      <EditorContent editor={editor} />

      {allowImages && (
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          data-testid="rich-text-image-input"
          onChange={(e) => {
            void insertImages(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      )}
      {imageError && (
        <p role="alert" className="border-t px-3 py-1.5 text-sm text-destructive">
          {imageError}
        </p>
      )}
      <div className="hidden items-center justify-end border-t px-3 py-1 text-xs text-muted-foreground md:flex">
        {t('counter', {
          words: editor.storage.characterCount.words(),
          chars: editor.storage.characterCount.characters(),
        })}
      </div>
    </div>
  );
}
