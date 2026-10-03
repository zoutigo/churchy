import { expect, test, type Page } from '@playwright/test';
import {
  VIEWPORTS,
  dayFromNow,
  hasHorizontalOverflow,
  registerViaUi,
  uniqueEmail,
} from './helpers';

const API = 'http://localhost:3211/api';

/** Date « AAAA-MM-JJ » du prochain jour de semaine donné (0 = dimanche), au moins `min` jours plus tard. */
function nextWeekday(weekday: number, min = 1): string {
  const d = new Date(Date.now() + min * 86_400_000);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function setup(page: Page, label: string, country = 'France') {
  await registerViaUi(page, uniqueEmail(`celeb-${label}`));
  const res = await page.request.post(`${API}/parishes`, {
    data: { name: `Paroisse ${label} ${Date.now()}`, city: 'Lyon', country },
  });
  const parish = await res.json();
  return parish.id as string;
}

async function createTemplate(page: Page, parishId: string, name: string, keys: string[]) {
  const tpl = await (
    await page.request.post(`${API}/parishes/${parishId}/templates`, {
      data: { name, type: 'SUNDAY_MASS' },
    })
  ).json();
  for (const [i, key] of keys.entries()) {
    await page.request.post(`${API}/templates/${tpl.id}/steps`, {
      data: { title: key, key, order: i + 1 },
    });
  }
  return tpl.id as string;
}

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`célébrations — ${device}`, () => {
    test.use({ viewport });

    test('crée une série récurrente, prépare une date à la volée, publie : le public la voit', async ({
      page,
    }) => {
      const parishId = await setup(page, device);
      const base = `/dashboard/parishes/${parishId}/celebrations`;

      await page.goto(base);
      await expect(page.getByText(/Aucune célébration pour l.instant/)).toBeVisible();
      await page.getByRole('link', { name: '+ Nouvelle célébration' }).click();
      await expect(page.getByRole('heading', { name: 'Nouvelle célébration' })).toBeVisible();
      // Plus de champ « ID du modèle » : le modèle se choisit dans une liste (facultatif).
      await expect(page.getByLabel('ID du modèle')).toHaveCount(0);
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.getByLabel('Titre').fill('Messe du dimanche');
      await page.getByLabel('Description publique').click();
      await page.keyboard.type('L’évêque sera des nôtres');

      // Récurrence : chaque dimanche, du premier dimanche à +3 semaines.
      await page.getByRole('button', { name: 'Chaque semaine' }).click();
      await page.getByRole('button', { name: 'dimanche' }).click(); // déjà actif par défaut → décoché…
      await page.getByRole('button', { name: 'dimanche' }).click(); // …puis recoché
      const first = nextWeekday(0);
      const last = new Date(Date.parse(first) + 21 * 86_400_000).toISOString().slice(0, 10);
      await page.getByLabel('Début').fill(first);
      await page.getByLabel('Fin').fill(last);
      await page.getByLabel('Heure', { exact: true }).fill('10:00');
      await expect(page.getByTestId('schedule-preview')).toContainText('4 dates seront créées');
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.getByLabel('Publier la série au public').check();
      await page.getByRole('button', { name: 'Créer la célébration' }).click();

      // Détail de la série : 4 dates, publiée.
      await expect(page).toHaveURL(new RegExp(`${base}/[^/]+$`));
      await expect(page.getByRole('heading', { name: 'Messe du dimanche' })).toBeVisible();
      await expect(page.getByTestId('series-status')).toContainText('Publiée au public');
      await expect(page.getByTestId('occurrence-item')).toHaveCount(4);
      await expect(page.getByText('Pas de feuille').first()).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      const seriesUrl = page.url();

      // Préparer la première date, à la volée.
      await page.getByRole('link', { name: 'Préparer la feuille' }).first().click();
      await expect(page.getByTestId('sheet-creator')).toBeVisible();
      await page
        .getByLabel('Modèle', { exact: true })
        .selectOption({ label: 'À la volée — feuille vide' });
      await page.getByRole('button', { name: 'Créer la feuille' }).click();
      await expect(page.getByTestId('sheet-panel')).toBeVisible();
      await expect(page.getByTestId('sheet-template-name')).toContainText('à la volée');

      await page.getByLabel('Titre de la nouvelle étape').fill('Chant à Marie');
      await page.getByRole('button', { name: 'Ajouter une étape' }).click();
      await expect(page.getByTestId('sheet-step')).toHaveCount(1);
      await page.getByLabel('Texte libre ou précision').fill('Ave Maria, 2 couplets');
      await page.getByLabel('Texte libre ou précision').blur();
      await expect(page.getByText('Étape enregistrée', { exact: true })).toBeVisible();
      expect(await hasHorizontalOverflow(page)).toBe(false);

      const occurrenceId = page.url().split('/').pop() as string;
      await page.getByRole('button', { name: 'Publier la feuille' }).click();
      await expect(
        page.locator('ol > li[data-state="open"]').getByText('Feuille publiée', { exact: true }),
      ).toBeVisible();
      // La publication ramène à la série (on ne reste pas devant le formulaire).
      await expect(page).toHaveURL(seriesUrl);
      await expect(page.getByTestId('sheet-panel')).toHaveCount(0);

      // Côté public : la date, sa feuille, la description de la série.
      await page.goto(`/paroisses/${parishId}/messes/${occurrenceId}`);
      await expect(page.getByText('Chant à Marie')).toBeVisible();
      await expect(page.getByText('Ave Maria, 2 couplets')).toBeVisible();
      await expect(page.getByText('L’évêque sera des nôtres')).toBeVisible();

      // Retour à la série : la première date affiche « Feuille publiée », les autres « Pas de feuille ».
      await page.goto(seriesUrl);
      await expect(page.getByText('Feuille publiée')).toHaveCount(1);
      await expect(page.getByText('Pas de feuille')).toHaveCount(3);
    });

    test('refuse le passé et au-delà d’un an dès la saisie, et rien n’est créé', async ({
      page,
    }) => {
      const parishId = await setup(page, `err-${device}`);
      await page.goto(`/dashboard/parishes/${parishId}/celebrations/new`);
      await page.getByLabel('Titre').fill('Messe impossible');

      await page.getByLabel('Date', { exact: true }).fill(dayFromNow(-3));
      await expect(page.getByTestId('schedule-preview')).toContainText('date passée');
      await page.getByLabel('Date', { exact: true }).fill(dayFromNow(400));
      await expect(page.getByTestId('schedule-preview')).toContainText('un an');

      await page.getByRole('button', { name: 'Créer la célébration' }).click();
      await expect(page.getByRole('alert').filter({ hasText: 'un an' }).first()).toBeVisible();
      await expect(page).toHaveURL(/celebrations\/new$/);

      const list = await (
        await page.request.get(`${API}/parishes/${parishId}/celebrations`)
      ).json();
      expect(list).toEqual([]);
    });

    test('plusieurs dates ponctuelles : ajout et retrait de lignes, aperçu', async ({ page }) => {
      const parishId = await setup(page, `dates-${device}`);
      await page.goto(`/dashboard/parishes/${parishId}/celebrations/new`);
      await page.getByRole('button', { name: 'Ajouter une date' }).click();
      await page.getByLabel('Date 1', { exact: true }).fill(dayFromNow(5));
      await page.getByLabel('Date 2', { exact: true }).fill(dayFromNow(12));
      await expect(page.getByTestId('schedule-preview')).toContainText('2 dates seront créées');
      await page.getByRole('button', { name: 'Retirer la date 2' }).click();
      await expect(page.getByTestId('schedule-preview')).toContainText('1 date sera créée');
    });

    test('changer de modèle : aperçu, contenu conservé, étapes libres', async ({ page }) => {
      const parishId = await setup(page, `tpl-${device}`);
      await createTemplate(page, parishId, 'Messe complète', ['entrance', 'psalm', 'gospel']);
      await createTemplate(page, parishId, 'Messe courte', ['entrance', 'sending']);
      const content = await (
        await page.request.post(`${API}/parishes/${parishId}/contents`, {
          data: { title: 'Peuple de Dieu', type: 'SONG', body: 'Paroles' },
        })
      ).json();
      const celebration = await (
        await page.request.post(`${API}/parishes/${parishId}/celebrations`, {
          data: {
            title: 'Messe',
            type: 'SUNDAY_MASS',
            schedule: { kind: 'dates', dates: [{ date: dayFromNow(6), time: '10:00' }] },
          },
        })
      ).json();
      const occ = celebration.occurrences[0].id;

      await page.goto(
        `/dashboard/parishes/${parishId}/celebrations/${celebration.id}/dates/${occ}`,
      );
      await page
        .getByLabel('Modèle', { exact: true })
        .selectOption({ label: 'Messe complète (3 étapes)' });
      await page.getByRole('button', { name: 'Créer la feuille' }).click();
      await expect(page.getByTestId('sheet-step')).toHaveCount(3);

      // Place un chant dans « entrance » et un texte dans « gospel ».
      await page.getByLabel('Contenu de la bibliothèque').first().selectOption(content.id);
      await expect(page.getByText('Étape enregistrée', { exact: true }).first()).toBeVisible();
      await page.getByLabel('Texte libre ou précision').nth(2).fill('Jn 3, 16');
      await page.getByLabel('Texte libre ou précision').nth(2).blur();
      await expect(
        page.getByTestId('sheet-step').nth(2).getByLabel('Texte libre ou précision'),
      ).toHaveValue('Jn 3, 16');

      await page.getByRole('button', { name: 'Changer de modèle' }).click();
      const dialog = page.getByTestId('template-change-dialog');
      await dialog.getByLabel('Nouveau modèle').selectOption({ label: 'Messe courte (2 étapes)' });
      const report = dialog.getByTestId('template-change-report');
      await expect(report).toContainText('Conservées (1)');
      await expect(report).toContainText('Ajoutées (vides) (1)');
      await expect(report).toContainText('Gardées comme étapes libres (1)'); // gospel rempli
      await expect(report).toContainText('Retirées (vides) (1)'); // psalm vide
      await dialog.getByRole('button', { name: 'Changer de modèle' }).click();

      await expect(page.getByTestId('sheet-template-name')).toContainText('Messe courte');
      const steps = page.getByTestId('sheet-step');
      await expect(steps).toHaveCount(3);
      await expect(steps.nth(0).getByLabel('Contenu de la bibliothèque')).toHaveValue(content.id);
      await expect(steps.nth(2).getByLabel('Texte libre ou précision')).toHaveValue('Jn 3, 16');
      await expect(steps.nth(2)).toContainText('Étape libre');
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test('crée un modèle depuis l’interface, le choisit pour la série : la feuille d’une date en reprend les étapes', async ({
      page,
    }) => {
      const parishId = await setup(page, `newtpl-${device}`);
      await page.goto(`/dashboard/parishes/${parishId}/templates`);
      await expect(page.getByText(/Aucun modèle pour l.instant/)).toBeVisible();
      await page.getByRole('button', { name: '+ Nouveau modèle' }).click();
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByLabel('Nom du modèle').fill('Messe de semaine');
      await page.getByLabel('Étape 1', { exact: true }).fill('Chant d’entrée');
      await page.getByRole('button', { name: 'Ajouter une étape' }).click();
      await page.getByLabel('Étape 2', { exact: true }).fill('Évangile');
      await page.getByRole('button', { name: 'Créer le modèle' }).click();
      await expect(page.getByTestId('template-card')).toContainText('Messe de semaine');
      await expect(page.getByTestId('template-card')).toContainText('2 étapes');
      expect(await hasHorizontalOverflow(page)).toBe(false);

      await page.goto(`/dashboard/parishes/${parishId}/celebrations/new`);
      await page.getByLabel('Titre').fill('Messe quotidienne');
      await page
        .getByLabel(/Modèle de feuille par défaut/)
        .selectOption({ label: 'Messe de semaine (2 étapes)' });
      await page.getByLabel('Date', { exact: true }).fill(dayFromNow(4));
      await page.getByRole('button', { name: 'Créer la célébration' }).click();
      await expect(page.getByTestId('occurrence-item')).toHaveCount(1);
      await page.getByRole('link', { name: 'Préparer la feuille' }).click();
      // Le modèle par défaut est présélectionné.
      await expect(page.getByLabel('Modèle', { exact: true })).toContainText(
        'Modèle par défaut — Messe de semaine',
      );
      await page.getByRole('button', { name: 'Créer la feuille' }).click();
      await expect(page.getByTestId('sheet-step')).toHaveCount(2);
      await expect(page.getByTestId('sheet-step').nth(0)).toContainText('Chant d’entrée');
      await expect(page.getByTestId('sheet-step').nth(1)).toContainText('Évangile');
    });

    test('annuler puis rétablir une date ; le public voit « annulée »', async ({ page }) => {
      const parishId = await setup(page, `cancel-${device}`);
      const celebration = await (
        await page.request.post(`${API}/parishes/${parishId}/celebrations`, {
          data: {
            title: 'Messe annulable',
            type: 'SUNDAY_MASS',
            announced: true,
            schedule: { kind: 'dates', dates: [{ date: dayFromNow(8), time: '10:00' }] },
          },
        })
      ).json();
      await page.goto(`/dashboard/parishes/${parishId}/celebrations/${celebration.id}`);
      await page.getByRole('button', { name: 'Annuler cette date' }).click();
      await page.getByLabel('Motif de l’annulation (facultatif)').fill('Pèlerinage');
      await page.getByRole('button', { name: 'Confirmer l’annulation' }).click();
      await expect(page.getByText('Annulée — Pèlerinage')).toBeVisible();

      await page.goto(`/paroisses/${parishId}/messes`);
      await expect(page.getByText('Messe annulable')).toBeVisible();
      await expect(page.getByText('Annulée', { exact: false }).first()).toBeVisible();

      await page.goto(`/dashboard/parishes/${parishId}/celebrations/${celebration.id}`);
      await page.getByRole('button', { name: 'Rétablir' }).click();
      await expect(page.getByText('Annulée — Pèlerinage')).toHaveCount(0);
    });

    test('rappel un mois avant la fin : message box une fois par session, lien pour prolonger', async ({
      page,
    }) => {
      const parishId = await setup(page, `soon-${device}`);
      const celebration = await (
        await page.request.post(`${API}/parishes/${parishId}/celebrations`, {
          data: {
            title: 'Série qui s’achève',
            type: 'WEEKDAY_MASS',
            schedule: { kind: 'dates', dates: [{ date: dayFromNow(12), time: '07:00' }] },
          },
        })
      ).json();
      const list = `/dashboard/parishes/${parishId}/celebrations`;

      await page.goto(list);
      const dialog = page.getByTestId('ending-soon-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Série qui s’achève');
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await dialog.getByRole('button', { name: 'Plus tard' }).click();
      await expect(dialog).toHaveCount(0);

      // Déjà vu pendant cette session : pas de nouvelle fenêtre.
      await page.reload();
      await expect(page.getByTestId('celebration-card')).toBeVisible();
      await expect(page.getByTestId('ending-soon-dialog')).toHaveCount(0);

      // Prolonger depuis la série : de nouvelles dates s'ajoutent.
      await page.goto(`${list}/${celebration.id}`);
      await expect(page.getByText('Cette série se termine bientôt')).toBeVisible();
      await page.getByRole('button', { name: 'Prolonger la série' }).click();
      await page.getByLabel('Date', { exact: true }).fill(dayFromNow(60));
      await page.getByRole('button', { name: 'Ajouter ces dates' }).click();
      await expect(page.getByTestId('occurrence-item')).toHaveCount(2);
      await expect(page.getByText('Cette série se termine bientôt')).toHaveCount(0);
    });
  });
}

test.describe('fuseau horaire de la paroisse', () => {
  test('les heures saisies sont celles de la paroisse (Douala), pas du navigateur', async ({
    page,
  }) => {
    const parishId = await setup(page, 'tz', 'Cameroun');
    await page.goto(`/dashboard/parishes/${parishId}/celebrations/new`);
    await page.getByLabel('Titre').fill('Messe de Douala');
    await page.getByLabel('Date', { exact: true }).fill(dayFromNow(5));
    await page.getByLabel('Heure', { exact: true }).fill('10:00');
    await expect(page.getByTestId('schedule-fields')).toContainText('Africa/Douala');
    await page.getByRole('button', { name: 'Créer la célébration' }).click();
    await expect(page.getByTestId('occurrence-item')).toHaveCount(1);
    await expect(page.getByTestId('occurrence-item')).toContainText('10:00');

    const [series] = await (
      await page.request.get(`${API}/parishes/${parishId}/celebrations`)
    ).json();
    // 10 h à Douala (UTC+1) = 09 h UTC, quel que soit le fuseau du navigateur.
    expect(series.nextOccurrence.startsAt).toMatch(/T09:00:00\.000Z$/);
  });
});

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`calendrier public — ${device}`, () => {
    test.use({ viewport });

    test('affiche les dates du mois, navigue entre les mois, montre une date annulée', async ({
      page,
    }) => {
      const parishId = await setup(page, `cal-${device}`);
      const publish = async (title: string, days: number, extra: object = {}) =>
        (
          await (
            await page.request.post(`${API}/parishes/${parishId}/celebrations`, {
              data: {
                title,
                type: 'SUNDAY_MASS',
                announced: true,
                schedule: { kind: 'dates', dates: [{ date: dayFromNow(days), time: '10:00' }] },
                ...extra,
              },
            })
          ).json()
        ).occurrences[0].id as string;
      await publish('Messe visible', 3);
      const cancelledId = await publish('Messe annulée', 3);
      await page.request.post(`${API}/occurrences/${cancelledId}/cancel`, {
        data: { reason: 'Pèlerinage' },
      });
      await page.request.post(`${API}/parishes/${parishId}/celebrations`, {
        data: {
          title: 'Messe cachée',
          type: 'SUNDAY_MASS',
          schedule: { kind: 'dates', dates: [{ date: dayFromNow(3), time: '10:00' }] },
        },
      });

      // Depuis la page « messes », on atteint le calendrier.
      await page.goto(`/paroisses/${parishId}/messes`);
      await page.getByRole('link', { name: 'Voir le calendrier' }).click();
      await expect(page).toHaveURL(new RegExp(`/paroisses/${parishId}/calendrier$`));
      expect(await hasHorizontalOverflow(page)).toBe(false);

      // Mobile : liste des jours ; tablette/desktop : grille. Un seul des deux est visible.
      const view = page.getByTestId(viewport.width < 768 ? 'calendar-list' : 'calendar-grid');
      await expect(view).toBeVisible();
      await expect(view.getByRole('link', { name: /Messe visible/ })).toBeVisible();
      await expect(view.getByRole('link', { name: /Messe annulée/ })).toHaveClass(/line-through/);
      await expect(view.getByText('Messe cachée')).toHaveCount(0);
      await expect(
        page.getByTestId(viewport.width < 768 ? 'calendar-grid' : 'calendar-list'),
      ).toBeHidden();

      // Un clic mène à la page de la messe.
      await view.getByRole('link', { name: /Messe visible/ }).click();
      await expect(page.getByRole('heading', { name: 'Messe visible' })).toBeVisible();
      await page.goBack();

      // Mois suivant puis précédent : le mois de départ est de nouveau affiché.
      await page.getByRole('link', { name: 'Mois suivant' }).click();
      await expect(page).toHaveURL(/mois=\d{4}-\d{2}/);
      await expect(page.getByRole('link', { name: /Messe visible/ })).toHaveCount(0);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      await page.getByRole('link', { name: 'Mois précédent' }).click();
      await expect(page.getByRole('link', { name: /Messe visible/ }).first()).toBeVisible();

      // Un mois mal formé dans l'URL retombe sur le mois courant, sans erreur.
      const res = await page.goto(`/paroisses/${parishId}/calendrier?mois=n-importe-quoi`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    });

    test('paroisse inconnue : page introuvable', async ({ page }) => {
      const res = await page.goto('/paroisses/inconnue/calendrier');
      expect(res?.status()).toBe(404);
    });
  });
}
