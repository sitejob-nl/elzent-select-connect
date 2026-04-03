import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:8080";
const ADMIN_EMAIL = "test@resid.nl";
const ADMIN_PASS = "Test1234!";
const SCREENSHOTS = "./qa-screenshots";

async function login(page: Page) {
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  // Fill login form
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 });
}

test.describe("Admin Panel QA Tests", () => {

  test("Test 1: Admin Login + Redirect", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${SCREENSHOTS}/01-login-page.png`, fullPage: true });

    // Fill login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Should redirect to /admin (not /dashboard) for admin users
    await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 });
    const url = page.url();
    await page.screenshot({ path: `${SCREENSHOTS}/01-after-login.png`, fullPage: true });

    console.log(`[TEST 1] Redirected to: ${url}`);
    if (url.includes("/admin")) {
      console.log("[TEST 1] PASS: Correctly redirected to /admin");
    } else if (url.includes("/dashboard")) {
      console.log("[TEST 1] FAIL: Redirected to /dashboard instead of /admin");
    } else {
      console.log(`[TEST 1] FAIL: Unexpected redirect to ${url}`);
    }
  });

  test("Test 2: Admin Dashboard KPIs", async ({ page }) => {
    await login(page);

    // Navigate to admin dashboard if not already there
    if (!page.url().includes("/admin")) {
      await page.goto(`${BASE}/admin`);
    }
    await page.waitForLoadState("networkidle");
    // Wait for loading spinner to disappear
    await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS}/02-admin-dashboard.png`, fullPage: true });

    // Check KPI cards
    const kpiTexts = await page.locator('.rounded-xl.border').allTextContents();
    console.log("[TEST 2] KPI cards found:", kpiTexts.length);
    console.log("[TEST 2] KPI content:", kpiTexts.slice(0, 4).join(" | "));

    // Check for "Gepubliceerd Aanbod"
    const hasPublished = await page.locator('text=Gepubliceerd Aanbod').count();
    console.log(`[TEST 2] "Gepubliceerd Aanbod" present: ${hasPublished > 0 ? "YES" : "NO"}`);

    // Check for "Actieve Klanten"
    const hasClients = await page.locator('text=Actieve Klanten').count();
    console.log(`[TEST 2] "Actieve Klanten" present: ${hasClients > 0 ? "YES" : "NO"}`);

    // Check for "Nieuwe Leads"
    const hasLeads = await page.locator('text=Nieuwe Leads').count();
    console.log(`[TEST 2] "Nieuwe Leads" present: ${hasLeads > 0 ? "YES" : "NO"}`);

    // Check for "Gem. BAR"
    const hasBar = await page.locator('text=Gem. BAR').count();
    console.log(`[TEST 2] "Gem. BAR" present: ${hasBar > 0 ? "YES" : "NO"}`);

    // Check "Recente Aanvragen" section
    const hasRecent = await page.locator('text=Recente Aanvragen').count();
    console.log(`[TEST 2] "Recente Aanvragen" section: ${hasRecent > 0 ? "YES" : "NO"}`);

    // Check quick link cards
    const hasAanbodLink = await page.locator('text=Aanbod Beheren').count();
    const hasKlantenLink = await page.locator('text=Klantenbeheer').count();
    const hasToegangsLink = await page.locator('text=Toegangsaanvragen').count();
    console.log(`[TEST 2] Quick links: Aanbod=${hasAanbodLink > 0}, Klanten=${hasKlantenLink > 0}, Toegang=${hasToegangsLink > 0}`);

    // Check console errors
    const errors: string[] = [];
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  });

  test("Test 3: Aanbod Beheren (CRUD)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/aanbod`);
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS}/03-aanbod-list.png`, fullPage: true });

    // Count existing properties
    const propertyRows = await page.locator('.border-b.last\\:border-0, [class*="border-b"][class*="last:border-0"]').count();
    console.log(`[TEST 3] Properties visible: check screenshot`);

    // Check filter tabs
    const filterAll = await page.locator('text=Alles').count();
    const filterPub = await page.locator('button:has-text("Gepubliceerd")').count();
    const filterDraft = await page.locator('button:has-text("Concept")').count();
    console.log(`[TEST 3] Filter tabs: Alles=${filterAll > 0}, Gepubliceerd=${filterPub > 0}, Concept=${filterDraft > 0}`);

    // CREATE: Click "Nieuw Object"
    await page.click('button:has-text("Nieuw Object")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/03-new-object-form.png`, fullPage: true });

    // Fill the form
    await page.fill('input >> nth=0', 'Test Pand QA');  // Titel
    await page.fill('input >> nth=1', 'test-pand-qa');   // Slug
    await page.fill('input >> nth=2', 'Amsterdam · 6 appartementen');  // Locatie
    await page.fill('input >> nth=3', 'Amsterdam');  // Stad

    // Fill number fields
    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('1500000');

    const barInput = page.locator('input[type="number"]').nth(1);
    await barInput.fill('6.5');

    // Type vastgoed
    await page.locator('input').filter({ hasText: '' }).nth(8).fill('Nieuwbouw').catch(() => {
      console.log("[TEST 3] Could not fill property type field directly");
    });

    // Status should default to "Concept" (draft)
    await page.screenshot({ path: `${SCREENSHOTS}/03-new-object-filled.png`, fullPage: true });

    // Click save
    await page.click('button:has-text("Aanmaken")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOTS}/03-after-create.png`, fullPage: true });

    // Check if toast appeared
    const toastCreate = await page.locator('text=Object aangemaakt').count();
    console.log(`[TEST 3] Create success toast: ${toastCreate > 0 ? "YES" : "NO"}`);

    // Check if the new object is in the list
    const newObj = await page.locator('text=Test Pand QA').count();
    console.log(`[TEST 3] New object in list: ${newObj > 0 ? "YES" : "NO"}`);

    // EDIT: Click pencil icon on the new object
    if (newObj > 0) {
      // Find the row with "Test Pand QA" and click its pencil
      const row = page.locator('div:has-text("Test Pand QA")').first();
      const pencilBtn = row.locator('button').first();
      await pencilBtn.click().catch(async () => {
        // Try clicking any pencil button
        const pencils = page.locator('svg.lucide-pencil').first();
        await pencils.click();
      });
      await page.waitForTimeout(500);

      // Change status to "Gepubliceerd"
      const statusSelect = page.locator('select');
      if (await statusSelect.count() > 0) {
        await statusSelect.selectOption('published');
        await page.screenshot({ path: `${SCREENSHOTS}/03-edit-status.png`, fullPage: true });

        await page.click('button:has-text("Opslaan")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SCREENSHOTS}/03-after-edit.png`, fullPage: true });

        const toastEdit = await page.locator('text=Object bijgewerkt').count();
        console.log(`[TEST 3] Edit success toast: ${toastEdit > 0 ? "YES" : "NO"}`);
      }
    }

    // Check status badge shows "Live"
    const liveBadge = await page.locator('text=Live').count();
    console.log(`[TEST 3] "Live" status badge visible: ${liveBadge > 0 ? "YES" : "NO"}`);

    // DELETE: Click trash icon
    const trashButtons = page.locator('svg.lucide-trash-2, [data-testid="delete"]').first();
    if (await trashButtons.count() > 0) {
      // Set up dialog handler for confirm
      page.on('dialog', dialog => dialog.accept());
      await trashButtons.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOTS}/03-after-delete.png`, fullPage: true });

      const toastDelete = await page.locator('text=Object verwijderd').count();
      console.log(`[TEST 3] Delete success toast: ${toastDelete > 0 ? "YES" : "NO"}`);

      // Verify object is gone
      const stillThere = await page.locator('text=Test Pand QA').count();
      console.log(`[TEST 3] Object removed from list: ${stillThere === 0 ? "YES" : "NO"}`);
    }

    // Test filter tabs
    await page.click('button:has-text("Gepubliceerd")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/03-filter-published.png`, fullPage: true });

    await page.click('button:has-text("Concept")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS}/03-filter-draft.png`, fullPage: true });

    await page.click('button:has-text("Alles")');
    await page.waitForTimeout(500);
  });

  test("Test 4: Klantenbeheer", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/klanten`);
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS}/04-klanten.png`, fullPage: true });

    // Note: since we upgraded test@resid.nl to admin, it won't show as client
    // Check page heading
    const heading = await page.locator('text=Klantenbeheer').count();
    console.log(`[TEST 4] Heading present: ${heading > 0 ? "YES" : "NO"}`);

    // Check client count
    const countText = await page.locator('text=geregistreerde beleggers').textContent().catch(() => "");
    console.log(`[TEST 4] Client count text: ${countText}`);

    // Check if "Lid sinds" is present
    const lidSinds = await page.locator('text=Lid sinds').count();
    console.log(`[TEST 4] "Lid sinds" visible: ${lidSinds > 0 ? "YES" : "NO (no clients or not visible)"}`);

    // Check empty state
    const noPrefs = await page.locator('text=Geen voorkeuren ingesteld').count();
    console.log(`[TEST 4] "Geen voorkeuren" message: ${noPrefs > 0 ? "YES" : "NO"}`);
  });

  test("Test 5: Lead Inbox", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/leads`);
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS}/05-leads.png`, fullPage: true });

    // Check heading
    const heading = await page.locator('text=Lead Inbox').count();
    console.log(`[TEST 5] Heading present: ${heading > 0 ? "YES" : "NO"}`);

    // Check if test leads are visible
    const jan = await page.locator('text=Jan van der Berg').count();
    const maria = await page.locator('text=Maria Bakker').count();
    const peter = await page.locator('text=Peter de Groot').count();
    console.log(`[TEST 5] Leads visible: Jan=${jan > 0}, Maria=${maria > 0}, Peter=${peter > 0}`);

    // Check lead details
    const leadsCount = await page.locator('text=leads').first().textContent().catch(() => "");
    console.log(`[TEST 5] Leads count text: ${leadsCount}`);

    // INVITE: Click UserPlus icon on first lead
    const inviteBtn = page.locator('button[title="Uitnodigen"]').first();
    if (await inviteBtn.count() > 0) {
      await inviteBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS}/05-after-invite.png`, fullPage: true });

      const invitedBadge = await page.locator('text=invited').count();
      console.log(`[TEST 5] "invited" status badge: ${invitedBadge > 0 ? "YES" : "NO"}`);
    } else {
      console.log("[TEST 5] No invite button found");
    }

    // ARCHIVE: Click Archive icon on second lead
    const archiveBtn = page.locator('button[title="Archiveren"]').first();
    if (await archiveBtn.count() > 0) {
      await archiveBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS}/05-after-archive.png`, fullPage: true });

      const archivedBadge = await page.locator('text=archived').count();
      console.log(`[TEST 5] "archived" status badge: ${archivedBadge > 0 ? "YES" : "NO"}`);
    } else {
      console.log("[TEST 5] No archive button found");
    }

    // Check mailto link
    const mailtoLink = page.locator('a[href^="mailto:"]').first();
    if (await mailtoLink.count() > 0) {
      const href = await mailtoLink.getAttribute("href");
      console.log(`[TEST 5] Mailto link: ${href}`);
    }
  });

  test("Test 6: Toegangsaanvragen", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/toegang`);
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS}/06-toegang.png`, fullPage: true });

    // Check heading
    const heading = await page.locator('text=Toegangsaanvragen').first().count();
    console.log(`[TEST 6] Heading present: ${heading > 0 ? "YES" : "NO"}`);

    // Check pending count
    const pendingText = await page.locator('text=openstaand').first().textContent().catch(() => "");
    console.log(`[TEST 6] Pending text: ${pendingText}`);

    // Check if test requests are visible
    const karel = await page.locator('text=Karel Smit').count();
    const sandra = await page.locator('text=Sandra Jansen').count();
    console.log(`[TEST 6] Requests visible: Karel=${karel > 0}, Sandra=${sandra > 0}`);

    // APPROVE: Click "Goedkeuren" for Karel
    const approveBtn = page.locator('button:has-text("Goedkeuren")').first();
    if (await approveBtn.count() > 0) {
      await approveBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS}/06-after-approve.png`, fullPage: true });

      const approved = await page.locator('text=Goedgekeurd').count();
      console.log(`[TEST 6] "Goedgekeurd" badge visible: ${approved > 0 ? "YES" : "NO"}`);
    }

    // REJECT: Click "Weigeren" for Sandra
    const rejectBtn = page.locator('button:has-text("Weigeren")').first();
    if (await rejectBtn.count() > 0) {
      await rejectBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOTS}/06-after-reject.png`, fullPage: true });

      const rejected = await page.locator('text=Geweigerd').count();
      console.log(`[TEST 6] "Geweigerd" badge visible: ${rejected > 0 ? "YES" : "NO"}`);
    }

    // Check "Verwerkt" section
    const verwerkt = await page.locator('text=Verwerkt').count();
    console.log(`[TEST 6] "Verwerkt" section visible: ${verwerkt > 0 ? "YES" : "NO"}`);

    // Check updated pending count
    const updatedPending = await page.locator('text=openstaand').first().textContent().catch(() => "");
    console.log(`[TEST 6] Updated pending text: ${updatedPending}`);
  });

  test("Test 7: Mobile Responsive (390x844)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    // Admin dashboard mobile
    if (!page.url().includes("/admin")) {
      await page.goto(`${BASE}/admin`);
    }
    await page.waitForLoadState("networkidle");
    await page.waitForSelector('[class*="animate-spin"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS}/07-mobile-dashboard.png`, fullPage: true });

    // Check mobile header
    const mobileHeader = await page.locator('text=Resid Admin').count();
    console.log(`[TEST 7] Mobile header "Resid Admin": ${mobileHeader > 0 ? "YES" : "NO"}`);

    // Check sidebar is hidden
    const sidebar = await page.locator('aside').first();
    const sidebarVisible = sidebar ? await sidebar.isVisible().catch(() => false) : false;
    console.log(`[TEST 7] Desktop sidebar hidden: ${!sidebarVisible ? "YES" : "NO"}`);

    // Check bottom nav
    const bottomNav = page.locator('nav.fixed.bottom-0, nav[class*="fixed"][class*="bottom-0"]');
    const bottomNavCount = await bottomNav.count();
    console.log(`[TEST 7] Bottom nav present: ${bottomNavCount > 0 ? "YES" : "NO"}`);

    // Check bottom nav items (5: Dashboard, Aanbod, Klanten, Leads, Toegang)
    const navItems = await page.locator('nav.fixed a, nav[class*="fixed"] a').count();
    console.log(`[TEST 7] Bottom nav items: ${navItems}`);

    // Check KPI cards are stacked
    await page.screenshot({ path: `${SCREENSHOTS}/07-mobile-kpis.png` });

    // Navigate to aanbod via bottom nav (use the visible one in the fixed bottom bar)
    await page.locator('nav.fixed a[href="/admin/aanbod"], nav[class*="fixed"] a[href="/admin/aanbod"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS}/07-mobile-aanbod.png`, fullPage: true });
    console.log(`[TEST 7] Mobile aanbod page loaded: ${page.url().includes("/admin/aanbod") ? "YES" : "NO"}`);

    // Check horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    console.log(`[TEST 7] Body width: ${bodyWidth}, Viewport: ${viewportWidth}, Horizontal scroll: ${bodyWidth > viewportWidth ? "YES (BAD)" : "NO (GOOD)"}`);

    // Navigate to leads via bottom nav
    await page.locator('nav.fixed a[href="/admin/leads"], nav[class*="fixed"] a[href="/admin/leads"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS}/07-mobile-leads.png`, fullPage: true });

    // Navigate to toegang via bottom nav
    await page.locator('nav.fixed a[href="/admin/toegang"], nav[class*="fixed"] a[href="/admin/toegang"]').click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOTS}/07-mobile-toegang.png`, fullPage: true });
  });

  test("Test 8: Client Access Control", async ({ page }) => {
    // First, we need to check that the role was set back to client
    // This test logs in and tries to access /admin routes
    // NOTE: This test should run AFTER we reset the role back to client

    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 });

    const afterLoginUrl = page.url();
    console.log(`[TEST 8] After login URL: ${afterLoginUrl}`);

    // Try to navigate to /admin
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(2000);
    const adminUrl = page.url();
    console.log(`[TEST 8] After /admin navigate: ${adminUrl}`);
    await page.screenshot({ path: `${SCREENSHOTS}/08-client-admin-redirect.png`, fullPage: true });

    const redirectedToDashboard = adminUrl.includes("/dashboard");
    console.log(`[TEST 8] Redirected to /dashboard: ${redirectedToDashboard ? "YES (PASS)" : "NO (FAIL)"}`);

    // Try other admin routes
    for (const route of ["/admin/aanbod", "/admin/klanten", "/admin/leads", "/admin/toegang"]) {
      await page.goto(`${BASE}${route}`);
      await page.waitForTimeout(1500);
      const routeUrl = page.url();
      console.log(`[TEST 8] ${route} -> ${routeUrl} (${routeUrl.includes("/dashboard") ? "PASS" : "FAIL"})`);
    }
    await page.screenshot({ path: `${SCREENSHOTS}/08-client-access-final.png`, fullPage: true });
  });
});
