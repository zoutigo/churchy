import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, hasHorizontalOverflow, registerViaUi, uniqueEmail } from './helpers';

// PNG 40×30 uni, valide, généré à la volée (décodable par le navigateur).
function png(width = 40, height = 30): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 2; // RVB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
};

async function createParish(page: Page): Promise<string> {
  const name = `Saint Texte ${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await registerViaUi(page, uniqueEmail('rich'));
  await page.goto('/dashboard/parishes');
  await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();
  await page.getByLabel('Nom de la paroisse').fill(name);
  await page.getByLabel('Pays', { exact: true }).selectOption('France');
  await page.getByLabel('Ville', { exact: true }).fill('Lille');
  await page.getByRole('button', { name: 'Créer la paroisse' }).click();
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await page.waitForURL(/\/dashboard\/parishes\/[^/]+$/);
  return page.url().split('/').pop() as string;
}

for (const [label, size] of Object.entries(VIEWPORTS)) {
  test.describe(`éditeur de texte riche — ${label}`, () => {
    test.use({ viewport: size });

    test('met en forme, insère une image et publie une activité', async ({ page }) => {
      const parishId = await createParish(page);
      await page.goto(`/dashboard/parishes/${parishId}/activities`);
      await page.getByRole('button', { name: '+ Nouvelle activité' }).click();
      await page.getByLabel('Titre').fill(`Fête ${label}`);

      const editor = page.getByRole('textbox', { name: 'Description' });
      await expect(editor).toBeVisible();

      // Barre d'outils : l'essentiel partout, le reste dépend de la taille d'écran.
      const toolbar = page.getByRole('toolbar', { name: 'Mise en forme' });
      await expect(toolbar.getByRole('button', { name: 'Gras' })).toBeVisible();
      await expect(toolbar.getByRole('button', { name: 'Insérer une image' })).toBeVisible();
      const bold = await toolbar.getByRole('button', { name: 'Gras' }).boundingBox();
      if (label === 'mobile') {
        expect(bold!.width).toBeGreaterThanOrEqual(40); // zone tactile
        await expect(toolbar.getByRole('button', { name: 'Centrer' })).toBeHidden();
        await toolbar.getByRole('button', { name: 'Plus d’options' }).click();
        await expect(toolbar.getByRole('button', { name: 'Centrer' })).toBeVisible();
      } else {
        await expect(toolbar.getByRole('button', { name: 'Centrer' })).toBeVisible();
        await expect(toolbar.getByRole('button', { name: 'Insérer un tableau' })).toBeVisible();
        await expect(toolbar.getByRole('button', { name: 'Plus d’options' })).toBeHidden();
      }
      if (label === 'desktop') await expect(page.getByText(/\d+ mots/)).toBeVisible();

      // Texte, gras, centrage.
      await editor.click();
      await page.getByRole('button', { name: 'Gras' }).click();
      await page.keyboard.type('Grande fête');
      await page.getByRole('button', { name: 'Gras' }).click();
      await page.keyboard.type(' pour tous.');
      if (label === 'mobile') {
        // le panneau « Plus » est toujours ouvert
        await page.getByRole('button', { name: 'Centrer' }).click();
      } else {
        await page.getByRole('button', { name: 'Centrer' }).click();
      }

      // Image inline : redimensionnée/compressée, largeur réglable.
      await page.getByTestId('rich-text-image-input').setInputFiles({
        name: 'affiche.png',
        mimeType: 'image/png',
        buffer: png(),
      });
      const img = editor.locator('img:not(.ProseMirror-separator)');
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
      await img.click();
      await page.getByRole('button', { name: '50 %' }).click();
      await expect(img).toHaveAttribute('data-width', '50');

      // Format refusé : message clair, éditeur intact.
      await page.getByTestId('rich-text-image-input').setInputFiles({
        name: 'x.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      });
      await expect(img).toHaveCount(1);

      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.getByLabel('Date et heure').fill(inDays(10));
      await page.getByRole('button', { name: 'Publier l’activité' }).click();
      await expect(page.getByText(`Fête ${label}`)).toBeVisible();

      // Rendu public : mise en forme et image conservées, sans débordement.
      await page.goto(`/paroisses/${parishId}/activites`);
      const article = page.locator('article', { hasText: `Fête ${label}` });
      await expect(article.locator('strong')).toHaveText('Grande fête');
      await expect(article.locator('.rich-content img')).toHaveAttribute('data-width', '50');
      await expect(article.locator('.rich-content img')).toHaveAttribute(
        'src',
        /^data:image\/jpeg/,
      );
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test('annonce : l’éditeur est exigé non vide et rendu public sécurisé', async ({ page }) => {
      const parishId = await createParish(page);
      await page.goto(`/dashboard/parishes/${parishId}/announcements`);
      await page.getByRole('button', { name: '+ Nouvelle annonce' }).click();
      await page.getByLabel('Titre').fill(`Annonce ${label}`);
      const editor = page.getByRole('textbox', { name: 'Contenu' });
      // Pas de bouton image pour les annonces.
      await expect(page.getByRole('button', { name: 'Insérer une image' })).toHaveCount(0);
      await editor.click();
      await page.keyboard.type('<script>alert(1)</script> Bonjour');
      await page.getByRole('button', { name: 'Liste à puces' }).click();
      await page.keyboard.type(' un');
      await page.getByRole('button', { name: 'Publier l’annonce' }).click();
      await expect(page.getByText(`Annonce ${label}`)).toBeVisible();

      await page.goto(`/paroisses/${parishId}/annonces`);
      const article = page.locator('article', { hasText: `Annonce ${label}` });
      await expect(article.locator('ul li')).toContainText('Bonjour un');
      await expect(article).toContainText('<script>alert(1)</script>'); // texte, jamais exécuté
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  });
}
