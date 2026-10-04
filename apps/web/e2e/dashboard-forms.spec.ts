import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, hasHorizontalOverflow, registerViaUi, uniqueEmail } from './helpers';

async function createParish(page: Page): Promise<string> {
  const name = `Saint Form ${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await registerViaUi(page, uniqueEmail('forms'));
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
  test.describe(`formulaires du tableau de bord — ${label}`, () => {
    test.use({ viewport: size });

    test('les formulaires sont fermés par défaut, s’ouvrent seuls et se referment', async ({
      page,
    }) => {
      const parishId = await createParish(page);
      const base = `/dashboard/parishes/${parishId}`;

      const pages = [
        { path: 'contents', open: '+ Ajouter un contenu', list: 'Bibliothèque de contenus' },
        { path: 'announcements', open: '+ Nouvelle annonce', list: 'Annonces' },
        { path: 'activities', open: '+ Nouvelle activité', list: 'Activités' },
      ];
      for (const p of pages) {
        await page.goto(`${base}/${p.path}`);
        await expect(page.getByRole('heading', { name: p.list, exact: true })).toBeVisible();
        await expect(page.getByLabel('Titre')).toHaveCount(0);

        await page.getByRole('button', { name: p.open }).click();
        await expect(page.getByLabel('Titre')).toBeVisible();
        // Le formulaire est seul à l'écran : plus de liste ni de bouton d'ajout.
        await expect(page.getByRole('heading', { name: p.list, exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: p.open })).toHaveCount(0);
        expect(await hasHorizontalOverflow(page)).toBe(false);

        await page.getByRole('button', { name: 'Retour' }).click();
        await expect(page.getByRole('button', { name: p.open })).toBeVisible();
        await expect(page.getByLabel('Titre')).toHaveCount(0);
      }

      // Identité publique : lecture seule, puis formulaire via « Modifier ».
      await page.goto(base);
      await expect(page.getByLabel('Adresse', { exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Modifier' }).click();
      await expect(page.getByLabel('Adresse', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Retour' }).click();
      await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();

      // Création de paroisse : même principe.
      await page.goto('/dashboard/parishes');
      await expect(page.getByLabel('Nom de la paroisse')).toHaveCount(0);
      await page.getByRole('button', { name: '+ Nouvelle paroisse' }).click();
      await expect(page.getByLabel('Nom de la paroisse')).toBeVisible();
      await page.getByRole('button', { name: 'Retour' }).click();
      await expect(page.getByLabel('Nom de la paroisse')).toHaveCount(0);
    });

    test('le formulaire de contenu est centré et occupe la largeur disponible', async ({
      page,
    }) => {
      const parishId = await createParish(page);
      await page.goto(`/dashboard/parishes/${parishId}/contents`);
      await page.getByRole('button', { name: '+ Ajouter un contenu' }).click();

      const editor = await page.getByRole('textbox', { name: 'Contenu' }).boundingBox();
      const main = (await page.locator('main').boundingBox())!;
      expect(editor).not.toBeNull();
      if (label === 'desktop') {
        // Large (au moins 60 % de la zone principale) et centré (marges gauche/droite voisines).
        expect(editor!.width).toBeGreaterThan(main.width * 0.6);
        const left = editor!.x - main.x;
        const right = main.x + main.width - (editor!.x + editor!.width);
        expect(Math.abs(left - right)).toBeLessThan(8);
        expect(editor!.height).toBeGreaterThan(300); // grande zone de saisie
      } else {
        expect(editor!.width).toBeGreaterThan(main.width * 0.8);
      }
    });

    test('la liste déroulante du type est lisible : fond opaque, options cliquables', async ({
      page,
    }) => {
      const parishId = await createParish(page);
      await page.goto(`/dashboard/parishes/${parishId}/contents`);
      await page.getByRole('button', { name: '+ Ajouter un contenu' }).click();
      await page.getByRole('combobox', { name: 'Type' }).click();

      const listbox = page.getByRole('listbox');
      await expect(listbox).toBeVisible();
      const bg = await listbox.evaluate(
        (el) =>
          getComputedStyle(el.closest('[data-radix-popper-content-wrapper]')!.firstElementChild!)
            .backgroundColor,
      );
      expect(bg).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);

      // Chaque option est au premier plan (rien d'autre n'est dessiné par-dessus) et ne chevauche pas la suivante.
      await page.waitForTimeout(400); // fin de l'animation d'ouverture
      const options = page.getByRole('option');
      const count = await options.count();
      expect(count).toBe(8);
      let previousBottom = -Infinity;
      for (let i = 0; i < count; i++) {
        const box = (await options.nth(i).boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(previousBottom - 1);
        previousBottom = box.y + box.height;
        if (box.y + box.height > size.height) continue; // défilement interne
        const onTop = await options.nth(i).evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return !!hit && el.contains(hit);
        });
        expect(onTop).toBe(true);
      }

      await page.getByRole('option', { name: 'Chant' }).click();
      await expect(page.getByRole('combobox', { name: 'Type' })).toHaveText('Chant');
    });
  });
}
