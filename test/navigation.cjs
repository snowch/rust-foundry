const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  http = require("node:http"),
  path = require("node:path");
const config = {
  root: "dist",
  parts: 4,
  lessons: 85,
  home: "#course",
  overview: ".foundry-lab-outline",
  complete: "[data-read-toggle]",
  prediction: "#course-prediction",
  position: ".lesson-position",
  progress: ".progress-copy",
  toggle: "#course-toggle",
  filter: "[data-hierarchy-filter]",
  next: ".adjacent-lessons a:last-child",
  previous: ".adjacent-lessons a:first-child",
  legacy: "#lab/start",
};
(async () => {
  const root = path.resolve(process.env.HIERARCHY_SITE || config.root),
    prefix = "/foundry-test/";
  const server = http.createServer(async (req, res) => {
    try {
      let name = new URL(req.url, "http://local").pathname;
      if (!name.startsWith(prefix)) throw Error("outside prefix");
      name = name.slice(prefix.length);
      if (!name || name.endsWith("/")) name += "index.html";
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      res.setHeader(
        "Content-Type",
        {
          ".js": "text/javascript",
          ".mjs": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".html": "text/html",
          ".svg": "image/svg+xml",
          ".wasm": "application/wasm",
        }[path.extname(name)] || "application/octet-stream",
      );
      res.end(await fs.readFile(path.join(root, name)));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port + prefix,
    browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.CHROMIUM_PATH ||
        (require("node:fs").existsSync("/usr/bin/chromium")
          ? "/usr/bin/chromium"
          : chromium.executablePath()),
    }),
    context = await browser.newContext(),
    page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(12000);
  let workers = 0;
  page.on("worker", () => workers++);
  page.on("pageerror", (e) => errors.push(e.message));
  async function go(href) {
    await page.goto(new URL(href, base).href);
    await page.locator("h1:visible").first().waitFor();
  }
  const complete = () =>
      page.locator(config.complete).filter({ visible: true }),
    prediction = () =>
      page.locator(config.prediction).filter({ visible: true });
  try {
    await go("");
    await page.locator(".lab-open").first().waitFor();
    const parts = await page
      .locator(".lab-open")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
    assert.equal(parts.length, config.parts);
    const catalogue = [];
    for (const [i, href] of parts.entries()) {
      await go(href);
      const part = page.locator(config.overview),
        chapters = await part
          .locator(".hierarchy-chapter h3 a")
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              title: n.textContent,
              href: n.getAttribute("href"),
            })),
          ),
        links = await part
          .locator(".hierarchy-lessons a")
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              title: n.querySelector("span:nth-child(2)").textContent,
              href: n.getAttribute("href"),
            })),
          );
      assert(chapters.length > 0);
      assert(links.length > 0);
      assert.match(
        await page
          .locator('nav[aria-label="Course location"]:visible')
          .first()
          .textContent(),
        new RegExp("Part " + (i + 1) + ":"),
      );
      catalogue.push({ href, chapters, links });
      for (const chapter of chapters) {
        await go(chapter.href);
        assert.match(
          await page
            .locator('nav[aria-label="Course location"]:visible')
            .first()
            .textContent(),
          /Chapter \d+:/,
        );
        assert.equal(
          await page.locator("h1:visible").first().textContent(),
          chapter.title.replace(/^Chapter \d+: /, ""),
        );
      }
    }
    const all = catalogue.flatMap((p) => p.links);
    assert.equal(
      new Set(all.map((x) => x.href)).size,
      config.lessons,
      "every original lesson belongs to exactly one part",
    );
    for (const [i, part] of catalogue.entries())
      for (const index of [
        ...new Set([
          0,
          Math.floor(part.links.length / 2),
          part.links.length - 1,
        ]),
      ]) {
        await go(part.links[index].href);
        assert.match(
          await page
            .locator(config.position)
            .filter({ visible: true })
            .first()
            .textContent(),
          /Lesson \d+ (?:of|\/)/,
        );
        assert.match(
          await page
            .locator(config.progress)
            .filter({ visible: true })
            .first()
            .textContent(),
          new RegExp(
            "Part " +
              (i + 1) +
              " progress: .* / " +
              part.links.length +
              " lessons complete",
          ),
        );
        const next = page.locator(config.next).filter({ visible: true }),
          prev = page.locator(config.previous).filter({ visible: true });
        assert.equal(
          new URL(await prev.getAttribute("href"), page.url()).href,
          new URL(index ? part.links[index - 1].href : part.href, base).href,
        );
        assert.equal(
          new URL(await next.getAttribute("href"), page.url()).href,
          new URL(
            index < part.links.length - 1
              ? part.links[index + 1].href
              : parts[i + 1] || config.home,
            base,
          ).href,
        );
        if (index === part.links.length - 1)
          assert.match(
            await next.textContent(),
            i < parts.length - 1 ? /Next part/ : /All parts/,
          );
      }
    await go(all[0].href);
    await prediction().fill("Keep this prediction across parts");
    await complete().check();
    await page.locator(config.toggle).click();
    const panel = page.locator(
      "#" + (await page.locator(config.toggle).getAttribute("aria-controls")),
    );
    const currentLink = panel.locator('a[aria-current="page"]');
    const popupPromise = context.waitForEvent("page");
    await currentLink.click({ modifiers: ["Control"] });
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    await popup.close();
    assert.equal(
      await page.locator(config.toggle).getAttribute("aria-expanded"),
      "true",
      "modified click keeps current contents open",
    );
    await currentLink.click();
    assert.equal(
      await page.locator(config.toggle).getAttribute("aria-expanded"),
      "false",
      "choosing current lesson closes contents",
    );
    assert(
      await page
        .locator("h1:visible")
        .first()
        .evaluate((n) => n === document.activeElement),
    );
    await page.locator(config.toggle).click();
    const original = page.url();
    await page.locator(config.filter).selectOption({ index: 2 });
    assert.equal(page.url(), original, "filter does not navigate");
    assert.equal(
      await prediction().inputValue(),
      "Keep this prediction across parts",
    );
    await page.locator(config.filter).focus();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator(config.toggle).getAttribute("aria-expanded"),
      "false",
    );
    assert(
      await page
        .locator(config.toggle)
        .evaluate((n) => n === document.activeElement),
    );
    await go(all.at(-1).href);
    await go(all[0].href);
    assert.equal(
      await prediction().inputValue(),
      "Keep this prediction across parts",
    );
    assert(await complete().isChecked());
    await page.locator(config.next).filter({ visible: true }).click();
    await page.goBack();
    assert(await complete().isChecked());
    await page.goForward();
    assert.match(
      await page.locator("h1:visible").first().textContent(),
      new RegExp(all[1].title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
    for (const href of [config.legacy]) {
      await go(href);
      assert(
        await page.locator('nav[aria-label="Course location"]:visible').count(),
      );
    }
    await fs.mkdir("test-results", { recursive: true });
    for (const width of [320, 390, 820, 1440])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const href of [
          config.home,
          parts[0],
          all[0].href,
          all[Math.floor(all.length / 2)].href,
          all.at(-1).href,
        ]) {
          await go(href);
          await page.evaluate(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${width} ${theme} ${href}`,
          );
        }
        await page.locator(config.toggle).click();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          width + " contents",
        );
        await page.keyboard.press("Escape");
        await page.screenshot({
          path: `test-results/hierarchy-${width}-${theme}.png`,
          fullPage: true,
        });
      }
    assert.equal(workers, 0, "navigation never starts a compiler");
    assert.equal(await page.locator("#terminal iframe").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${config.parts} parts, ${catalogue.reduce((n, p) => n + p.chapters.length, 0)} chapters, ${all.length} stable lessons; boundaries, parent links, progress, filters, saved prediction/completion, history, aliases, themes, layouts and no automatic runtime`,
    );
  } finally {
    await context.close();
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
