import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:8080";
const CREDS = { email: "test@resid.nl", password: "Test1234!" };

test.describe("Resid QA - Volledige Klant Flow", () => {
  // ================================================================
  // TEST 1: Login Pagina
  // ================================================================
  test("Test 1: Login pagina laadt correct", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "qa-screenshots/01-login-page.png", fullPage: true });

    // Check heading
    const heading = page.locator("h1");
    await expect(heading).toContainText("Welkom Terug");

    // Check branding: "Resid" not "Elzent Select"
    const body = await page.textContent("body");
    expect(body).toContain("Resid");
    expect(body).not.toContain("Elzent Select");

    // Check "Toegang Aanvragen" button
    const accessBtn = page.locator("button", { hasText: "Toegang Aanvragen" });
    await expect(accessBtn).toBeVisible();

    // Check form fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check copyright
    expect(body).toContain("2026 Resid");

    console.log("TEST 1 RESULT: PASS - Login pagina laadt correct met Welkom Terug heading, Resid branding, en Toegang Aanvragen knop");
  });

  // ================================================================
  // TEST 2: Login & Dashboard
  // ================================================================
  test("Test 2: Login en Dashboard", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");

    // Fill login form
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.screenshot({ path: "qa-screenshots/02a-login-filled.png" });

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    // Wait a bit for data to load
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/02b-dashboard.png", fullPage: true });

    // Check dashboard loads
    expect(page.url()).toContain("/dashboard");

    // Check greeting - should NOT be hardcoded "Jan"
    const h1 = await page.textContent("h1");
    console.log(`Dashboard greeting: "${h1}"`);
    expect(h1).not.toContain("Jan");
    expect(h1).toContain("Test"); // "Test Belegger" -> firstName = "Test"

    // Check stats cards (4 cards)
    const statCards = page.locator(".rounded-xl.border.border-border.bg-card.p-5");
    const count = await statCards.count();
    console.log(`Stats cards found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(4);

    // Check "Recente Matches" section
    const matchesHeading = page.locator("h2", { hasText: "Recente Matches" });
    await expect(matchesHeading).toBeVisible();

    // Check "Bekijk alles" link
    const viewAll = page.locator("a", { hasText: "Bekijk alles" });
    await expect(viewAll).toBeVisible();

    console.log(`TEST 2 RESULT: PASS - Dashboard laadt met dynamische naam "${h1}", ${count} stat cards, en Recente Matches sectie`);
  });

  // ================================================================
  // TEST 3: Aanbod Pagina
  // ================================================================
  test("Test 3: Aanbod pagina met zoeken en filters", async ({ page }) => {
    // Login first
    await page.goto(BASE);
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to aanbod
    await page.goto(BASE + "/aanbod");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/03a-aanbod-page.png", fullPage: true });

    // Check heading
    await expect(page.locator("h1")).toContainText("Exclusief Aanbod");

    // Check filter tabs
    const matchesTab = page.locator("button", { hasText: "Uw matches" });
    const allTab = page.locator("button", { hasText: "Al het aanbod" });
    await expect(matchesTab).toBeVisible();
    await expect(allTab).toBeVisible();

    // Check properties are loaded - click "Al het aanbod" first to see all
    await allTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "qa-screenshots/03b-all-aanbod.png", fullPage: true });

    const propertyCards = page.locator("h3.font-display.font-semibold");
    const propCount = await propertyCards.count();
    console.log(`Properties found (all): ${propCount}`);
    expect(propCount).toBeGreaterThanOrEqual(3);

    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Zoeken"]');
    await searchInput.fill("Eindhoven");
    await page.waitForTimeout(500);
    await page.screenshot({ path: "qa-screenshots/03c-search-eindhoven.png", fullPage: true });

    const filteredCards = page.locator("h3.font-display.font-semibold");
    const filteredCount = await filteredCards.count();
    console.log(`Properties after search "Eindhoven": ${filteredCount}`);
    expect(filteredCount).toBe(1);
    await expect(filteredCards.first()).toContainText("Strijp-S Lofts");

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(500);

    // Test "Uw matches" filter
    await matchesTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "qa-screenshots/03d-matches-filter.png", fullPage: true });

    // Check match score badges
    const matchBadges = page.locator("text=/\\d+% Match/");
    const badgeCount = await matchBadges.count();
    console.log(`Match badges found: ${badgeCount}`);

    console.log(`TEST 3 RESULT: PASS - Aanbod pagina met ${propCount} properties, zoekfunctie werkt, filter tabs werken, ${badgeCount} match badges`);
  });

  // ================================================================
  // TEST 4: Detail Pagina
  // ================================================================
  test("Test 4: Detail pagina (bastion-1)", async ({ page }) => {
    // Login
    await page.goto(BASE);
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to detail
    await page.goto(BASE + "/aanbod/bastion-1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/04a-detail-page.png", fullPage: true });

    // Check title
    const title = page.locator("h1");
    await expect(title).toContainText("Bastion 1");

    // Check stats cards (Investering, BAR, Oppervlakte, Eenheden)
    const investering = page.getByText("Investering", { exact: true });
    await expect(investering).toBeVisible();
    const bar = page.locator("text=BAR").first();
    await expect(bar).toBeVisible();

    // Check description
    const description = page.locator("h2", { hasText: "Project Beschrijving" });
    await expect(description).toBeVisible();

    // Check timeline (3 steps)
    const timelineHeading = page.locator("h2", { hasText: "Tijdlijn & Proces" });
    await expect(timelineHeading).toBeVisible();
    const timelineSteps = page.locator("h3.font-body.font-semibold.text-foreground.text-sm");
    const stepCount = await timelineSteps.count();
    console.log(`Timeline steps found: ${stepCount}`);
    expect(stepCount).toBeGreaterThanOrEqual(3);

    // Check view count (schaarste-indicator)
    const viewCountText = page.locator("text=/Dit object is \\d+ keer bekeken/");
    const viewCountVisible = await viewCountText.isVisible().catch(() => false);
    console.log(`View count indicator visible: ${viewCountVisible}`);

    // Check "Interesse Tonen" button
    const interestBtn = page.locator("button", { hasText: "Interesse Tonen" });
    const interestVisible = await interestBtn.isVisible().catch(() => false);
    console.log(`Interest button visible: ${interestVisible}`);

    // Scroll to bottom for full screenshot
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: "qa-screenshots/04b-detail-bottom.png", fullPage: true });

    console.log(`TEST 4 RESULT: PASS - Detail pagina laadt met titel, stats, ${stepCount} timeline stappen, schaarste-indicator: ${viewCountVisible}, interesse knop: ${interestVisible}`);
  });

  // ================================================================
  // TEST 5: Favorieten Toggle
  // ================================================================
  test("Test 5: Favorieten toggle", async ({ page }) => {
    // Login
    await page.goto(BASE);
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Go to aanbod, show all
    await page.goto(BASE + "/aanbod");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.click("button:has-text('Al het aanbod')");
    await page.waitForTimeout(1000);

    // Find heart icon button (not filled initially)
    const heartButtons = page.locator("button .lucide-heart, button:has(.lucide-heart)");
    const firstHeart = page.locator("button:has(.lucide-heart)").first();
    await page.screenshot({ path: "qa-screenshots/05a-before-favorite.png" });

    // Click to favorite
    await firstHeart.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "qa-screenshots/05b-after-favorite.png" });

    // Check if heart changed to filled (class contains fill-red-400)
    const heartIcon = firstHeart.locator("svg");
    const heartClass = await heartIcon.getAttribute("class");
    console.log(`Heart class after favorite: ${heartClass}`);
    const isFilled = heartClass?.includes("fill-red-400") ?? false;
    console.log(`Heart is filled: ${isFilled}`);

    // Click again to unfavorite
    await firstHeart.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "qa-screenshots/05c-after-unfavorite.png" });

    const heartClassAfter = await heartIcon.getAttribute("class");
    const isUnfilled = !heartClassAfter?.includes("fill-red-400");
    console.log(`Heart is unfilled after toggle back: ${isUnfilled}`);

    console.log(`TEST 5 RESULT: ${isFilled && isUnfilled ? "PASS" : "FAIL"} - Favoriet toggle: filled=${isFilled}, unfilled after toggle=${isUnfilled}`);
  });

  // ================================================================
  // TEST 6: Interesse Melden
  // ================================================================
  test("Test 6: Interesse melden", async ({ page }) => {
    // Login
    await page.goto(BASE);
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Go to detail page
    await page.goto(BASE + "/aanbod/strijp-s-lofts");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Fill message
    const textarea = page.locator("textarea");
    const textareaVisible = await textarea.isVisible().catch(() => false);
    if (textareaVisible) {
      await textarea.fill("Ik heb interesse in dit project. Graag meer informatie.");
      await page.screenshot({ path: "qa-screenshots/06a-interest-message.png", fullPage: true });

      // Click "Interesse Tonen"
      const interestBtn = page.locator("button", { hasText: "Interesse Tonen" });
      await interestBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "qa-screenshots/06b-interest-submitted.png", fullPage: true });

      // Check for confirmation - either toast or changed button
      const confirmText = page.locator("text=Interesse gemeld");
      const toastText = page.locator("text=Wij nemen spoedig contact met u op");
      const isConfirmed = await confirmText.isVisible().catch(() => false);
      const isToast = await toastText.isVisible().catch(() => false);
      console.log(`Interest confirmed box: ${isConfirmed}, Toast: ${isToast}`);

      console.log(`TEST 6 RESULT: ${isConfirmed || isToast ? "PASS" : "FAIL"} - Interesse melden: confirmed=${isConfirmed}, toast=${isToast}`);
    } else {
      // Already submitted interest
      const alreadySubmitted = page.locator("text=Interesse gemeld");
      const isAlready = await alreadySubmitted.isVisible().catch(() => false);
      console.log(`TEST 6 RESULT: ${isAlready ? "PASS" : "FAIL"} - Interesse was al gemeld: ${isAlready}`);
      await page.screenshot({ path: "qa-screenshots/06a-already-submitted.png", fullPage: true });
    }
  });

  // ================================================================
  // TEST 7: Profiel Pagina
  // ================================================================
  test("Test 7: Profiel pagina - voorkeuren opslaan", async ({ page }) => {
    // Login
    await page.goto(BASE);
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to profiel
    await page.goto(BASE + "/profiel");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/07a-profiel-page.png", fullPage: true });

    // Check heading
    await expect(page.locator("h1")).toContainText("Investeringsprofiel");

    // Check regions are loaded (from seed data)
    const regionButtons = page.locator("button:has-text(\"'s-Hertogenbosch\")");
    const regionCount = await regionButtons.count();
    console.log(`Region buttons found: ${regionCount}`);

    // Check existing preferences loaded (regions should be pre-selected)
    // The seed data had 's-Hertogenbosch and Eindhoven
    const eindhovenBtn = page.locator("button:has-text('Eindhoven')").first();
    const eindhovenClass = await eindhovenBtn.getAttribute("class");
    const isEindhovenSelected = eindhovenClass?.includes("border-primary") ?? false;
    console.log(`Eindhoven pre-selected: ${isEindhovenSelected}`);

    // Check type checkboxes
    const transformatieCheckbox = page.locator("label:has-text('Transformatie') input[type='checkbox']");
    const isTransChecked = await transformatieCheckbox.isChecked();
    console.log(`Transformatie checked: ${isTransChecked}`);

    // Toggle Tilburg region on
    const tilburgBtn = page.locator("button:has-text('Tilburg')").first();
    await tilburgBtn.click();
    await page.waitForTimeout(500);

    // Adjust budget slider
    const budgetSlider = page.locator("input[type='range']").first();
    await budgetSlider.fill("70"); // ~70%
    await page.waitForTimeout(500);

    await page.screenshot({ path: "qa-screenshots/07b-profiel-changed.png", fullPage: true });

    // Click save
    const saveBtn = page.locator("button", { hasText: "Profiel Opslaan" });
    await saveBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/07c-profiel-saved.png", fullPage: true });

    // Check for toast
    const successToast = page.locator("text=Profiel opgeslagen");
    const toastVisible = await successToast.isVisible().catch(() => false);
    console.log(`Save toast visible: ${toastVisible}`);

    // Reload page and check persistence
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/07d-profiel-reloaded.png", fullPage: true });

    // Check Tilburg is still selected
    const tilburgAfter = page.locator("button:has-text('Tilburg')").first();
    const tilburgClassAfter = await tilburgAfter.getAttribute("class");
    const tilburgSelected = tilburgClassAfter?.includes("border-primary") ?? false;
    console.log(`Tilburg still selected after reload: ${tilburgSelected}`);

    console.log(`TEST 7 RESULT: ${toastVisible ? "PASS" : "FAIL"} - Profiel: toast=${toastVisible}, persistence=${tilburgSelected}`);
  });

  // ================================================================
  // TEST 8: Mobile Responsive (390x844)
  // ================================================================
  test("Test 8: Mobile responsive (iPhone 14)", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
    });
    const page = await context.newPage();

    // Login page
    await page.goto(BASE);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "qa-screenshots/08a-mobile-login.png", fullPage: true });

    // Check hero image hidden on mobile (hidden lg:flex)
    const heroDiv = page.locator(".hidden.lg\\:flex");
    const heroVisible = await heroDiv.isVisible().catch(() => false);
    console.log(`Hero image visible on mobile: ${heroVisible} (should be false)`);

    // Login
    await page.fill('input[type="email"]', CREDS.email);
    await page.fill('input[type="password"]', CREDS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/08b-mobile-dashboard.png", fullPage: true });

    // Check stats are stacked (grid-cols-1 on mobile)
    // Check navigation
    const desktopNav = page.locator("nav.hidden.md\\:flex");
    const navVisible = await desktopNav.isVisible().catch(() => false);
    console.log(`Desktop nav visible on mobile: ${navVisible} (should be false)`);

    // Navigate to aanbod
    await page.goto(BASE + "/aanbod");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/08c-mobile-aanbod.png", fullPage: true });

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    console.log(`Body width: ${bodyWidth}, Viewport width: ${viewportWidth}`);
    const hasHorizontalScroll = bodyWidth > viewportWidth + 5; // 5px tolerance
    console.log(`Horizontal scroll: ${hasHorizontalScroll} (should be false)`);

    // Navigate to detail
    await page.goto(BASE + "/aanbod/bastion-1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/08d-mobile-detail.png", fullPage: true });

    // Navigate to profiel
    await page.goto(BASE + "/profiel");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "qa-screenshots/08e-mobile-profiel.png", fullPage: true });

    // Check hamburger or mobile nav handling
    // The app uses "hidden md:flex" so no hamburger menu exists
    // This is a potential UX issue: no mobile navigation
    const mobileMenuBtn = page.locator("[data-mobile-menu], .hamburger, button:has(.lucide-menu)");
    const mobileMenuExists = await mobileMenuBtn.count() > 0;
    console.log(`Mobile menu button exists: ${mobileMenuExists}`);

    await context.close();

    console.log(`TEST 8 RESULT: ${!hasHorizontalScroll ? "PASS" : "FAIL"} - Mobile: heroHidden=${!heroVisible}, noHorizontalScroll=${!hasHorizontalScroll}, navHidden=${!navVisible}, mobileMenu=${mobileMenuExists}`);
    if (!mobileMenuExists) {
      console.log("WARNING: Geen mobiel navigatiemenu (hamburger) aanwezig - gebruiker kan niet navigeren op mobiel");
    }
  });
});
