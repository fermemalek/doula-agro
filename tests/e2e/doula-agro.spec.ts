import { test, expect, type Page } from "@playwright/test";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000099";
const SUPABASE_AUTH_KEY = "sb-krmvdahejfczrziobesi-auth-token";

interface MockBackendState {
  recos: any[];
  moduleRecords: any[];
}

async function setupMockSessionAndBackend(
  page: Page,
  opts: { lang: "fr" | "ar"; role?: "ingenieur" | "admin" },
): Promise<{ state: MockBackendState; pageErrors: string[] }> {
  const role = opts.role ?? "ingenieur";
  const state: MockBackendState = {
    recos: [],
    moduleRecords: [],
  };
  const pageErrors: string[] = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err.message || String(err));
  });

  // Auto-accept confirm() dialogs when deleting a recommendation
  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  // Inject authenticated Supabase session + language + role before app boots
  await page.addInitScript(
    ({ authKey, userId, activeRole, lang }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600 * 24;
      const fakeSession = {
        access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwOTkiLCJleHAiOjQxMDI0NDQ4MDB9.mock",
        token_type: "bearer",
        expires_in: 86400,
        expires_at: expiresAt,
        refresh_token: "mock-refresh-token",
        user: {
          id: userId,
          aud: "authenticated",
          role: "authenticated",
          email: "ingenieur@doula-agro.dz",
          user_metadata: {},
          app_metadata: { provider: "email" },
          created_at: "2026-01-01T00:00:00.000Z",
        },
      };
      localStorage.setItem(authKey, JSON.stringify(fakeSession));
      localStorage.setItem("doula-active-role", activeRole);
      localStorage.setItem(`doula-role:${userId}`, activeRole);
      localStorage.setItem(
        "doula-config",
        JSON.stringify({ role: activeRole, bgColor: "", bgImage: "", configured: true, lang }),
      );
      sessionStorage.setItem("doula-session-active", "1");
    },
    { authKey: SUPABASE_AUTH_KEY, userId: MOCK_USER_ID, activeRole: role, lang: opts.lang },
  );

  // Intercept Supabase REST & Auth calls hermetically in memory
  await page.route("**/*supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    const pathname = url.pathname;

    if (pathname.includes("/auth/v1/user")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: MOCK_USER_ID,
          aud: "authenticated",
          role: "authenticated",
          email: "ingenieur@doula-agro.dz",
          user_metadata: {},
        }),
      });
    }

    if (pathname.includes("/auth/v1/token")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 86400,
          refresh_token: "mock-refresh",
          user: { id: MOCK_USER_ID, email: "ingenieur@doula-agro.dz" },
        }),
      });
    }

    if (pathname.includes("/rest/v1/user_roles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ user_id: MOCK_USER_ID, role }]),
      });
    }

    if (pathname.includes("/rest/v1/recommendations")) {
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(state.recos),
        });
      }
      if (method === "POST") {
        const body = req.postDataJSON();
        const rows = Array.isArray(body) ? body : [body];
        for (const r of rows) {
          state.recos.unshift(r);
        }
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(Array.isArray(body) ? rows : rows[0]),
        });
      }
      if (method === "PATCH") {
        const idEq = url.searchParams.get("id")?.replace(/^eq\./, "");
        const patch = req.postDataJSON() || {};
        state.recos = state.recos.map((r) => (r.id === idEq ? { ...r, ...patch } : r));
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
      if (method === "DELETE") {
        const idEq = url.searchParams.get("id")?.replace(/^eq\./, "");
        if (idEq) {
          state.recos = state.recos.filter((r) => r.id !== idEq);
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
    }

    if (pathname.includes("/rest/v1/module_records")) {
      if (method === "GET") {
        if (state.moduleRecords.length === 0) {
          return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "offline-mock" }) });
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(state.moduleRecords),
        });
      }
      if (method === "POST") {
        const body = req.postDataJSON();
        const rows = Array.isArray(body) ? body : [body];
        state.moduleRecords.unshift(...rows);
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(rows) });
      }
      if (method === "DELETE") {
        const idEq = url.searchParams.get("id")?.replace(/^eq\./, "");
        if (idEq) {
          state.moduleRecords = state.moduleRecords.filter((m) => m.id !== idEq);
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock weather API so /meteo and PhytoAdvisorModal never hang offline
  await page.route("**/*open-meteo.com/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current: { temperature_2m: 18, wind_speed_10m: 8, relative_humidity_2m: 55, precipitation: 0, weather_code: 1 },
        hourly: {
          time: ["2026-04-20T08:00", "2026-04-20T12:00"],
          temperature_2m: [14, 20],
          precipitation: [0, 0],
          wind_speed_10m: [7, 10],
          relative_humidity_2m: [60, 50],
        },
        daily: {
          time: ["2026-04-20", "2026-04-21"],
          temperature_2m_max: [22, 23],
          temperature_2m_min: [9, 10],
          precipitation_sum: [0, 0],
          wind_speed_10m_max: [12, 14],
          weather_code: [1, 2],
        },
      }),
    });
  });

  return { state, pageErrors };
}

async function assertNoHorizontalOverflow(page: Page, contextLabel: string) {
  await page.waitForTimeout(350);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    dir: document.documentElement.dir,
  }));
  expect(
    metrics.scrollWidth,
    `Débordement horizontal détecté sur [${contextLabel}] (dir=${metrics.dir}): scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

async function assertDialogCenteredInViewport(page: Page, contextLabel: string) {
  const dialog = page.locator('[role="dialog"]').last();
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box, `Dialog boundingBox introuvable sur [${contextLabel}]`).not.toBeNull();
  if (box) {
    expect(box.x, `Dialog rogné à gauche sur [${contextLabel}]: x=${box.x}`).toBeGreaterThanOrEqual(-1);
    expect(
      box.x + box.width,
      `Dialog dépasse à droite sur [${contextLabel}]: right=${box.x + box.width} > 360`,
    ).toBeLessThanOrEqual(361);
  }
}

test.describe("1. Audit Mobile (360×800) & FR LTR / AR RTL — Zéro débordement & Zéro erreur JS", () => {
  for (const lang of ["fr", "ar"] as const) {
    const expectedDir = lang === "ar" ? "rtl" : "ltr";

    test(`Audit complet des écrans & modales en ${lang.toUpperCase()} (${expectedDir})`, async ({ page }) => {
      const { pageErrors } = await setupMockSessionAndBackend(page, { lang, role: "ingenieur" });

      // 1. Accueil Ingénieur
      await page.goto("/#/");
      await expect(page.locator("main")).toBeVisible();
      const langToggle = page.getByRole("button", { name: lang === "ar" ? /^AR$/ : /^FR$/ }).first();
      await expect(langToggle).toBeVisible();
      await langToggle.click();
      await expect(page.locator("html")).toHaveAttribute("dir", expectedDir);
      await assertNoHorizontalOverflow(page, `${lang}:Accueil`);

      // 2. Recommandations + Modale RecommendationForm + PhytoAdvisorModal
      await page.goto("/#/recommandations");
      await assertNoHorizontalOverflow(page, `${lang}:Recommandations`);

      // Ouvrir RecommendationForm
      const newRecoBtn = page.getByRole("button", { name: lang === "ar" ? /توصية جديدة|جديد/i : /Nouvelle|Ajouter|\+/i }).first();
      if (await newRecoBtn.isVisible()) {
        await newRecoBtn.click();
        await assertDialogCenteredInViewport(page, `${lang}:RecommendationForm`);
        await assertNoHorizontalOverflow(page, `${lang}:RecommendationForm`);

        // Passer sur Phytosanitaire et ouvrir PhytoAdvisorModal si le bouton est visible
        const phytoTabBtn = page.getByRole("button", { name: lang === "ar" ? /صحة نباتية|وقائي/i : /Phyto/i }).first();
        if (await phytoTabBtn.isVisible()) {
          await phytoTabBtn.click();
          const advisorBtn = page.getByRole("button", { name: lang === "ar" ? /دليل المقاومة|مساعد/i : /Assistant Phyto|Guide/i }).first();
          if (await advisorBtn.isVisible()) {
            await advisorBtn.click();
            await assertNoHorizontalOverflow(page, `${lang}:PhytoAdvisorModal`);
            await page.keyboard.press("Escape");
          }
        }
        // Fermer proprement RecommendationForm (onEscapeKeyDown est volontairement bloqué sur cette modale)
        const closeFormBtn = page.getByRole("button", { name: lang === "ar" ? /إلغاء وإغلاق/i : /Annuler et fermer/i }).first();
        if (await closeFormBtn.isVisible().catch(() => false)) {
          await closeFormBtn.click();
        }
      }

      // 3. Météo / Heures de froid
      await page.goto("/#/meteo");
      await assertNoHorizontalOverflow(page, `${lang}:Meteo`);

      // 4. Parcelle Pommier 1 (Pulvérisation, Phytosanitaire, Récolte)
      await page.goto("/#/parcelle/pommier1");
      await assertNoHorizontalOverflow(page, `${lang}:Parcelle:Infos`);

      for (const tabRegex of [
        lang === "ar" ? /الرش الورقي|Pulvérisation/i : /Pulvérisation/i,
        lang === "ar" ? /المبيدات|Phytosanitaire/i : /Phytosanitaire/i,
        lang === "ar" ? /الجني|Récolte/i : /Récolte/i,
      ]) {
        const tabBtn = page.getByRole("button", { name: tabRegex }).first();
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await assertNoHorizontalOverflow(page, `${lang}:Parcelle:${tabRegex}`);
        }
      }

      // 5. Rendement Ferme + Chambre Froide & Négoce
      await page.goto("/#/rendement");
      await assertNoHorizontalOverflow(page, `${lang}:Rendement`);

      const frigoTab = page.getByRole("button", {
        name: lang === "ar" ? /غرف التبريد/i : /Chambre Froide/i,
      });
      await frigoTab.click();
      await assertNoHorizontalOverflow(page, `${lang}:Rendement:ChambreFroide`);

      expect(pageErrors, `Erreurs JS détectées en ${lang}: ${pageErrors.join(" | ")}`).toEqual([]);
    });
  }
});

test.describe("2. Parcours E2E complets (vrais clics utilisateur dans Chromium)", () => {
  test("Parcours A — Blocages Phyto réels (Luna + Bellis FRAC 7, puis Sivento + Sivento Double Emploi)", async ({ page }) => {
    const { pageErrors } = await setupMockSessionAndBackend(page, { lang: "fr", role: "ingenieur" });

    await page.goto("/#/recommandations");
    await page.getByRole("button", { name: /Nouvelle/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Sélectionner POMMIERS + Phytosanitaire (désélectionner Irrigation)
    await page.getByRole("button", { name: /POMMIERS/i }).click();
    await page.getByRole("button", { name: /Fert\. Irrigation|Irrigation/i }).first().click();
    await page.getByRole("button", { name: /Phytosanitaire|Phyto/i }).first().click();

    // Remplir date
    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    for (let i = 0; i < count; i++) {
      await dateInputs.nth(i).fill("2026-04-20");
    }

    // Ajouter 2ème produit
    await page.getByRole("button", { name: /\+ 2ème Produit/i }).click();

    const phytoSelects = page.locator("select").filter({ has: page.locator('option[value="Sivento"]') });
    await expect(phytoSelects).toHaveCount(2);

    // Cas 1 : Luna + Bellis → FRAC 7 commun bloquant
    await phytoSelects.nth(0).selectOption("Luna");
    await phytoSelects.nth(1).selectOption("Bellis");

    await expect(page.getByText(/FRAC 7 commun/i)).toBeVisible();
    const blockedTankBtn = page.getByRole("button", { name: /Bloqué : Incompatibilité Tank-Mix/i }).first();
    await expect(blockedTankBtn).toBeDisabled();

    // Cas 2 : Sivento + Sivento → Double Emploi bloquant
    await phytoSelects.nth(0).selectOption("Sivento");
    await phytoSelects.nth(1).selectOption("Sivento");

    await expect(page.getByText(/Double emploi de la même matière active/i)).toBeVisible();
    const blockedDupBtn = page.getByRole("button", { name: /Bloqué : Double emploi de matière active/i }).first();
    await expect(blockedDupBtn).toBeDisabled();

    expect(pageErrors).toEqual([]);
  });

  test("Parcours B — Création valide (SCORE + Calypso), affichage dans Recommandations, puis Suppression en cascade", async ({ page }) => {
    const { state, pageErrors } = await setupMockSessionAndBackend(page, { lang: "fr", role: "ingenieur" });

    await page.goto("/#/recommandations");
    await page.getByRole("button", { name: /Nouvelle/i }).first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.getByRole("button", { name: /POMMIERS/i }).click();
    await page.getByRole("button", { name: /Fert\. Irrigation|Irrigation/i }).first().click();
    await page.getByRole("button", { name: /Phytosanitaire|Phyto/i }).first().click();

    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    for (let i = 0; i < count; i++) {
      await dateInputs.nth(i).fill("2026-04-20");
    }

    await page.getByRole("button", { name: /\+ 2ème Produit/i }).click();
    const phytoSelects = page.locator("select").filter({ has: page.locator('option[value="Sivento"]') });
    await phytoSelects.nth(0).selectOption("SCORE");
    await phytoSelects.nth(1).selectOption("Calypso");

    await expect(page.getByText(/Mélange parfaitement compatible/i)).toBeVisible();

    const submitBtn = page.getByRole("button", { name: /En attente/i }).first();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Vérifier l'apparition dans Recommandations (mise à jour optimiste + synchro mock)
    await expect(page.getByText(/SCORE \+ Calypso/i).first()).toBeVisible();
    await expect.poll(() => state.recos.length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);

    // Supprimer via la poubelle sur la carte
    const deleteBtn = page.locator('button[title*="Supprimer"], button[title*="حذف"]').first();
    await deleteBtn.click();

    // Vérifier disparition dans la liste
    await expect(page.getByText(/SCORE \+ Calypso/i)).toHaveCount(0);

    // Vérifier aussi que PhytoHistoryModal est en lecture seule (aucune poubelle) et ne contient pas la reco supprimée
    await page.getByRole("button", { name: /Nouvelle/i }).first().click();
    await page.getByRole("button", { name: /Phytosanitaire|Phyto/i }).first().click();
    const histBtn = page.getByRole("button", { name: /Historique/i }).first();
    if (await histBtn.isVisible()) {
      await histBtn.click();
      await expect(page.getByText(/Historique en lecture seule/i)).toBeVisible();
      await expect(page.getByText(/SCORE \+ Calypso/i)).toHaveCount(0);
    }

    expect(pageErrors).toEqual([]);
  });

  test("Parcours C — Récolte dédupliquée (10 253 kg) & Chambre Froide (2 740 cajous, 43 716 kg, 363,87 DA/kg)", async ({ page }) => {
    const { pageErrors } = await setupMockSessionAndBackend(page, { lang: "fr", role: "admin" });

    await page.goto("/#/rendement");

    // 4 bordereaux dédupliqués Pommier (jamais 20 507 kg)
    await expect(page.getByText(/10[\s\u00a0\u202f]253/i).first()).toBeVisible();
    await expect(page.getByText(/20[\s\u00a0\u202f]507/i)).toHaveCount(0);

    // Ouvrir l'onglet Chambre Froide & Négoce (Grande & Petite)
    await page.getByRole("button", { name: /Chambre Froide & Négoce/i }).click();

    await expect(page.getByText(/2[\s\u00a0\u202f]740/i).first()).toBeVisible();
    await expect(page.getByText(/43[\s\u00a0\u202f]716/i).first()).toBeVisible();
    await expect(page.getByText(/363,87/i).first()).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
