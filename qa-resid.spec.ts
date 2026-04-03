import { test, expect } from "@playwright/test";
import { mkdir } from "fs/promises";

const BASE = "http://localhost:8080";
const SCREENSHOT_DIR = "qa-screenshots";

const BELEGGER = { email: "belegger@resid.nl", password: "Demo2026!" };
const ADMIN = { email: "admin@resid.nl", password: "Demo2026!" };

async function screenshot(page, name: string) {
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
}

async function login(page, creds: { email: string; password: string }) {
  // Listen for console errors and network failures
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400 && resp.url().includes("supabase")) {
      errors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();

  // Wait for either redirect or toast error
  try {
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 20000 });
  } catch {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-login-fail.png`, fullPage: true });
    throw new Error(`Login failed. URL: ${page.url()}. Console errors: ${errors.join(' | ')}`);
  }
}

// ============================================================
// BELEGGER FLOW
// ============================================================
test.describe("Belegger Flow", () => {
  test.describe.configure({ mode: "serial" });

  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("1. Login als belegger", async () => {
    await login(page, BELEGGER);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Welkom terug");
    await screenshot(page, "01-belegger-login-success");
  });

  test("2. Dashboard - stats en matches", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Check stat cards exist
    const statCards = page.locator(".rounded-xl.border.border-border.bg-card.p-5");
    await expect(statCards.first()).toBeVisible();

    // Check recent matches section
    await expect(page.locator("h2", { hasText: "Recente Matches" })).toBeVisible();
    await screenshot(page, "02-belegger-dashboard");
  });

  test("3. Aanbod - filteren en zoeken", async () => {
    await page.goto(`${BASE}/aanbod`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page.locator("h1", { hasText: "Exclusief Aanbod" })).toBeVisible();
    await screenshot(page, "03-belegger-aanbod-overview");

    // Filter: Uw matches
    const matchFilter = page.locator("button", { hasText: "Uw matches" });
    if (await matchFilter.isVisible()) {
      await matchFilter.click();
      await page.waitForTimeout(1000);
      await screenshot(page, "03b-belegger-aanbod-matches");
    }

    // Filter: Al het aanbod
    const allFilter = page.locator("button", { hasText: "Al het aanbod" });
    if (await allFilter.isVisible()) {
      await allFilter.click();
      await page.waitForTimeout(1000);
    }

    // Search
    const searchInput = page.locator('input[type="text"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("Eindhoven");
      await page.waitForTimeout(1000);
      await screenshot(page, "03c-belegger-aanbod-search-eindhoven");
      await searchInput.clear();
    }
  });

  test("4. Object detail - matchscore en schaarste", async () => {
    await page.goto(`${BASE}/aanbod`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Click first property detail link
    const detailLink = page.locator("a", { hasText: "Details" }).first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
    } else {
      // Try clicking a property card directly
      const propertyLink = page.locator("a[href*='/aanbod/']").first();
      await propertyLink.click();
    }
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page).toHaveURL(/\/aanbod\/.+/);
    await screenshot(page, "04-belegger-detail-top");

    // Check match score
    const matchBadge = page.locator("text=/Match/").first();
    if (await matchBadge.isVisible()) {
      console.log("PASS: Match score badge visible");
    }

    // Check schaarste indicator (view count)
    const viewCount = page.locator("text=/keer bekeken/");
    if (await viewCount.isVisible()) {
      const text = await viewCount.textContent();
      console.log(`PASS: Schaarste indicator: ${text}`);
    }

    // Scroll down for full page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, "04b-belegger-detail-bottom");
  });

  test("5. Favorieten toggle", async () => {
    // Should still be on detail page
    const saveBtn = page.locator("button", { hasText: /Opslaan|Opgeslagen/ });
    if (await saveBtn.isVisible()) {
      const initialText = await saveBtn.textContent();
      await saveBtn.click();
      await page.waitForTimeout(1000);
      const afterText = await saveBtn.textContent();
      console.log(`Favoriet toggle: "${initialText}" → "${afterText}"`);
      await screenshot(page, "05-belegger-favoriet-toggle");
    } else {
      // Try heart button
      const heartBtn = page.locator("button").filter({ has: page.locator("svg") }).first();
      await heartBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, "05-belegger-favoriet-toggle");
    }
  });

  test("6. Interesse melden", async () => {
    // Should still be on detail page, scroll to interest form
    const interestBtn = page.locator("button", { hasText: /Interesse Tonen|Interesse gemeld/ });

    if (await interestBtn.isVisible()) {
      const btnText = await interestBtn.textContent();
      if (btnText?.includes("Tonen")) {
        // Fill optional message
        const textarea = page.locator("textarea");
        if (await textarea.isVisible()) {
          await textarea.fill("Test interesse via Playwright");
        }
        await interestBtn.click();
        await page.waitForTimeout(1500);
        console.log("PASS: Interesse gemeld");
      } else {
        console.log("PASS: Interesse was al gemeld");
      }
    }
    await screenshot(page, "06-belegger-interesse");
  });

  test("7. Profiel voorkeuren", async () => {
    await page.goto(`${BASE}/profiel`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page.locator("h1", { hasText: "Investeringsprofiel" })).toBeVisible();

    // Check regions
    const eindhovenBtn = page.locator("button", { hasText: "Eindhoven" });
    if (await eindhovenBtn.isVisible()) {
      console.log("PASS: Regio buttons visible");
    }

    // Check sliders
    const sliders = page.locator('input[type="range"]');
    const sliderCount = await sliders.count();
    console.log(`Sliders gevonden: ${sliderCount}`);

    await screenshot(page, "07-belegger-profiel-top");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await screenshot(page, "07b-belegger-profiel-bottom");
  });

  test("8. Mobiel weergave (390x844)", async () => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Dashboard mobile
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "08-belegger-mobiel-dashboard");

    // Aanbod mobile
    await page.goto(`${BASE}/aanbod`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "08b-belegger-mobiel-aanbod");

    // Detail mobile
    const propertyLink = page.locator("a[href*='/aanbod/']").first();
    if (await propertyLink.isVisible()) {
      await propertyLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await screenshot(page, "08c-belegger-mobiel-detail");
    }

    // Profiel mobile
    await page.goto(`${BASE}/profiel`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "08d-belegger-mobiel-profiel");

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

// ============================================================
// ADMIN FLOW
// ============================================================
test.describe("Admin Flow", () => {
  test.describe.configure({ mode: "serial" });

  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("1. Login als admin → redirect naar /admin", async () => {
    await login(page, ADMIN);
    await expect(page).toHaveURL(/\/admin/);
    await screenshot(page, "09-admin-login-redirect");
  });

  test("2. Dashboard KPIs", async () => {
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page.locator("h1", { hasText: "Admin Dashboard" })).toBeVisible();

    // Check KPI labels
    await expect(page.locator("text=Gepubliceerd Aanbod")).toBeVisible();
    await expect(page.locator("text=Actieve Klanten")).toBeVisible();
    await expect(page.locator("text=Nieuwe Leads")).toBeVisible();

    // Check recent requests
    await expect(page.locator("text=Recente Aanvragen")).toBeVisible();

    await screenshot(page, "10-admin-dashboard-kpis");
  });

  test("3. Object aanmaken + publiceren", async () => {
    await page.goto(`${BASE}/admin/aanbod`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page.locator("h1", { hasText: "Aanbod Beheren" })).toBeVisible();
    await screenshot(page, "11-admin-aanbod-list");

    // Click "Nieuw Object"
    await page.locator("button", { hasText: "Nieuw Object" }).click();
    await page.waitForTimeout(500);
    await screenshot(page, "11b-admin-aanbod-form-empty");

    // Fill form
    const inputs = page.locator("input");
    const inputCount = await inputs.count();

    // Find and fill by label association
    // Title
    await page.locator("label", { hasText: "Titel" }).locator("..").locator("input").fill("Test Pand Playwright");

    // Slug
    await page.locator("label", { hasText: "Slug" }).locator("..").locator("input").fill("test-pand-playwright");

    // Location
    await page.locator("label", { hasText: "Locatie" }).locator("..").locator("input").fill("Teststraat 1, Eindhoven");

    // City
    await page.locator("label", { hasText: "Stad" }).locator("..").locator("input").fill("Eindhoven");

    // Description
    const textarea = page.locator("textarea");
    if (await textarea.isVisible()) {
      await textarea.fill("Dit is een testobject aangemaakt door Playwright.");
    }

    // Price
    const priceLabel = page.locator("label", { hasText: "Prijs" });
    if (await priceLabel.isVisible()) {
      await priceLabel.locator("..").locator("input").fill("350000");
    }

    // BAR
    const barLabel = page.locator("label", { hasText: "BAR" });
    if (await barLabel.isVisible()) {
      await barLabel.locator("..").locator("input").fill("5.5");
    }

    // Status → Gepubliceerd
    const statusSelect = page.locator("select");
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption("published");
    }

    await screenshot(page, "11c-admin-aanbod-form-filled");

    // Submit
    await page.locator("button", { hasText: /Aanmaken|Opslaan/ }).click();
    await page.waitForTimeout(2000);
    await screenshot(page, "11d-admin-aanbod-after-create");
  });

  test("4. Leads inbox", async () => {
    await page.goto(`${BASE}/admin/leads`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page.locator("h1", { hasText: "Lead" })).toBeVisible();
    await screenshot(page, "12-admin-leads");

    // Check lead names exist
    const leadContent = await page.textContent("body");
    if (leadContent?.includes("Jan de Groot")) {
      console.log("PASS: Lead 'Jan de Groot' found");
    }
    if (leadContent?.includes("Sandra Vermeulen")) {
      console.log("PASS: Lead 'Sandra Vermeulen' found");
    }
  });

  test("5. Toegangsaanvraag goedkeuren", async () => {
    await page.goto(`${BASE}/admin/toegang`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await expect(page.locator("h1", { hasText: "Toegangsaanvragen" })).toBeVisible();
    await screenshot(page, "13-admin-toegang");

    // Check pending requests
    const approveBtn = page.locator("button", { hasText: "Goedkeuren" }).first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(2000);
      console.log("PASS: Toegangsaanvraag goedgekeurd");
      await screenshot(page, "13b-admin-toegang-approved");
    }

    // Check reviewed section
    const reviewedSection = page.locator("text=VERWERKT");
    if (await reviewedSection.isVisible()) {
      console.log("PASS: Verwerkte aanvragen zichtbaar");
    }
  });

  test("6. Mobiel weergave (390x844)", async () => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Admin dashboard mobile
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "14-admin-mobiel-dashboard");

    // Admin aanbod mobile
    await page.goto(`${BASE}/admin/aanbod`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "14b-admin-mobiel-aanbod");

    // Admin leads mobile
    await page.goto(`${BASE}/admin/leads`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "14c-admin-mobiel-leads");

    // Admin toegang mobile
    await page.goto(`${BASE}/admin/toegang`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await screenshot(page, "14d-admin-mobiel-toegang");

    // Reset
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
