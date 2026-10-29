import { expect, test, type Page } from "@playwright/test";

const DHAKA_DISTRICT = "1047";

async function submitReport(page: Page, product: string, price: string) {
  await page.goto("/submit");
  await page.getByLabel("পণ্যের নাম").fill(product);
  await page.getByLabel("ক্যাটাগরি", { exact: true }).selectOption({ label: "শাকসবজি" });
  await page.getByLabel("দাম (৳)").fill(price);
  await page.locator("#loc-division").selectOption({ label: "ঢাকা" });
  await page.locator("#loc-district").selectOption(DHAKA_DISTRICT);
  await page.getByRole("button", { name: "দাম জমা দিন" }).click();
  await expect(page.getByRole("heading", { name: "ধন্যবাদ! আপনার দেওয়া দাম জমা হয়েছে।" })).toBeVisible();
  await page.getByRole("link", { name: "রিপোর্টটি দেখুন" }).click();
  await expect(page.getByRole("heading", { level: 1, name: product })).toBeVisible();
}

test.describe("public visitor", () => {
  test("opens the Bengali homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "bn");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("বাজারে যাওয়ার আগে জেনে নিন, দাম কত!");
    await expect(page.getByRole("link", { name: "দাম যোগ করুন" }).first()).toBeVisible();
  });

  test("searches, filters by district, switches to map, selects a marker and opens a report", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero-q").fill("আলু");
    await page.getByRole("button", { name: "খুঁজুন" }).click();
    await expect(page).toHaveURL(/\/prices\?q=/);
    await expect(page.locator("article").first()).toContainText("আলু");

    await page.locator("#d-district").selectOption(DHAKA_DISTRICT);
    await expect(page).toHaveURL(new RegExp(`district=${DHAKA_DISTRICT}`));
    await expect(page.getByRole("link", { name: /ঢাকা/ }).first()).toBeVisible();

    await page.goto("/prices?category=vegetables");
    await page.locator(`a[href="/map?category=vegetables"]`).click();
    await expect(page).toHaveURL(/\/map\?category=vegetables/);
    // Markers are keyboard-accessible; this also avoids overlapping pins.
    const marker = page.locator(".leaflet-marker-icon").filter({ has: page.locator(".dk-marker") }).first();
    await expect(marker).toBeVisible();
    await marker.focus();
    await page.keyboard.press("Enter");
    const popupLink = page.locator(".leaflet-popup").getByRole("link", { name: "বিস্তারিত দেখুন" }).first();
    await expect(popupLink).toBeVisible();
    await popupLink.click();
    await expect(page).toHaveURL(/\/prices\/[0-9a-f-]{36}$/);
    await expect(page.getByText("রিপোর্ট করা দাম")).toBeVisible();
  });

  test("shows empty and not-found states", async ({ page }) => {
    await page.goto("/prices?q=zzqqxxnotaproduct");
    await expect(page.getByText("এই ফিল্টারে কোনো দাম পাওয়া যায়নি")).toBeVisible();
    await page.goto("/prices/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("পৃষ্ঠাটি পাওয়া যায়নি")).toBeVisible();
  });

  test("switches the interface to English and remembers it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "English" }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know the price before you go to the market!");
    await page.goto("/prices");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find prices");
    expect(await page.evaluate(() => localStorage.getItem("damkoto.lang"))).toBe("en");
  });
});

test.describe("contributing", () => {
  test("rejects invalid price and missing location", async ({ page }) => {
    await page.goto("/submit");
    await page.getByLabel("পণ্যের নাম").fill("বেগুন");
    await page.getByLabel("দাম (৳)").fill("-5");
    await page.getByRole("button", { name: "দাম জমা দিন" }).click();
    await expect(page.getByText("সঠিক দাম লিখুন (শুধু সংখ্যা)।")).toBeVisible();
    await expect(page.getByText("এলাকা বেছে নেওয়া বাধ্যতামূলক — অন্তত জেলা বেছে নিন।")).toBeVisible();
    await expect(page.getByText("একটি ক্যাটাগরি বেছে নিন।")).toBeVisible();
  });

  test("submits without image or name, then comments with a sticker", async ({ page }) => {
    await submitReport(page, "পরীক্ষার কাঁচামরিচ", "120");
    await expect(page.getByText("নাম উল্লেখ করেননি").first()).toBeVisible();
    await expect(page.getByText("এটি আপনার রিপোর্ট")).toBeVisible();

    await page.locator("#comment-body").fill("আমার এলাকায় একটু কম।");
    await page.getByRole("button", { name: "স্টিকার" }).first().click();
    await page.getByRole("radio", { name: /এত দাম!/ }).click();
    await page.getByRole("button", { name: "মন্তব্য করুন" }).click();
    const comment = page.locator("ol article").first();
    await expect(comment).toContainText("আমার এলাকায় একটু কম।");
    await expect(comment).toContainText("এত দাম!");
  });
});

test.describe("moderation", () => {
  test("unauthorized visitors cannot reach admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin|\/login\?next=\/admin/);
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a moderator reviews flagged content", async ({ page }) => {
    await submitReport(page, "অভিযোগের পরীক্ষা", "999");
    await page.getByRole("button", { name: "সমস্যা জানান" }).click();
    await page.getByRole("dialog").getByRole("combobox").selectOption("wrong_price");
    await page.getByRole("dialog").getByRole("button", { name: "জানান" }).click();
    await expect(page.getByText("ধন্যবাদ! মডারেটররা বিষয়টি দেখবেন।")).toBeVisible();

    await page.goto("/login?next=/admin/content-reports");
    await page.getByRole("button", { name: "moderator হিসেবে ঢুকুন" }).click();
    await expect(page).toHaveURL(/\/admin\/content-reports/);
    const item = page.locator("li").filter({ hasText: "অভিযোগের পরীক্ষা" });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "সমাধান (কনটেন্ট লুকান)" }).click();
    await expect(page.getByText("সম্পন্ন হয়েছে।")).toBeVisible();
    await expect(page.locator("li").filter({ hasText: "অভিযোগের পরীক্ষা" })).toHaveCount(0);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("bottom navigation and filter sheet work", async ({ page }) => {
    await page.goto("/");
    const tabBar = page.locator("nav").filter({ has: page.getByRole("link", { name: "দাম যোগ করুন" }) }).last();
    await expect(tabBar).toBeVisible();
    await tabBar.getByRole("link", { name: "বাজারদর" }).click();
    await expect(page).toHaveURL(/\/prices$/);
    await page.getByRole("button", { name: "ফিল্টার দেখুন" }).click();
    await page.locator("#m-category").selectOption("vegetables");
    await expect(page).toHaveURL(/category=vegetables/);
    await page.getByRole("dialog").getByRole("button", { name: /ফলাফল/ }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("map/list toggle does not loop or log errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/map");
    await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("tab", { name: "তালিকা" }).click();
      await expect(page.locator("[data-report]").first()).toBeVisible();
      await page.getByRole("tab", { name: "ম্যাপ" }).click();
      await expect(page.locator(".leaflet-container")).toBeVisible();
    }
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => /Maximum update depth|destroy is not a function/.test(e))).toEqual([]);
  });
});
