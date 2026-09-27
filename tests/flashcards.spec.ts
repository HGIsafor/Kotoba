import { test, expect } from '@playwright/test';
import { cards } from '../src/cards';

// Existing vocabulary workflows exercise the N5 level; starter defaults have
// separate coverage in kana.spec.ts.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kotoba.level.v1', 'n5'));
});

test('first-side choice works during practice and survives reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Japanese first', exact: true }).click();
  await page.getByRole('button', { name: 'Start flashcard practice', exact: true }).click();
  let face = page.getByRole('button', { name: 'Reveal answer', exact: true });
  await expect(face).toContainText(cards[0].word);
  await expect(face).not.toContainText(cards[0].meaning);
  await face.click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText(cards[0].meaning);
  await page.getByRole('button', { name: 'English first', exact: true }).click();
  await expect(face).toContainText(cards[0].meaning);
  await expect(face).not.toContainText(cards[0].word);
  await page.getByRole('button', { name: 'Japanese first', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Japanese first', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Start flashcard practice', exact: true }).click();
  await expect(face).toContainText(cards[0].word);
});

test('learned cards can be reviewed and the shared logo stays fixed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const logo = page.getByRole('button', { name: 'Kotoba home', exact: true });
  const original = await logo.boundingBox();
  async function logoHasNotMoved() {
    await expect(logo).toHaveCount(1);
    expect(await logo.boundingBox()).toEqual(original);
  }
  await page.getByRole('button', { name: 'Review learned cards', exact: true }).click();
  await expect(page.getByText('No learned cards yet.')).toBeVisible();
  await logoHasNotMoved();
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('konnichiwa');
  await page.getByRole('button', { name: 'Practice 1 words →', exact: true }).click();
  await expect(page.getByTestId('practice-transition')).toHaveCSS('opacity', '1');
  await logoHasNotMoved();
  await page.getByRole('button', { name: 'Reveal answer ↻', exact: true }).click();
  await page.getByRole('button', { name: 'Got it ✓', exact: true }).click();
  await logo.click();
  await page.getByRole('button', { name: 'Review learned cards', exact: true }).click();
  const learnedCard = page.getByRole('button', { name: 'Practice こんにちは, konnichiwa, hello; good afternoon', exact: true });
  await expect(learnedCard).toBeVisible();
  await expect(page.getByRole('button', { name: 'Practice 1 words →', exact: true })).toBeEnabled();
  await learnedCard.click();
  await page.getByRole('button', { name: 'Reveal answer ↻', exact: true }).click();
  await page.getByRole('button', { name: 'Keep practicing', exact: true }).click();
  await page.getByRole('button', { name: 'Back from practice', exact: true }).click();
  await expect(page.getByText('No learned cards yet.')).toBeVisible();
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('');
  await page.mouse.move(200, 600);
  await page.mouse.wheel(0, 600);
  await logoHasNotMoved();
});

test('previous card retraces a shuffled session and both faces retain their dimensions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Shuffle ⇄', exact: true }).click();
  const previous = page.getByRole('button', { name: '← Previous card', exact: true });
  await expect(previous).toBeDisabled();
  const entrance = page.getByTestId('practice-transition');
  await expect(entrance).toHaveCSS('opacity', '1');
  const card = page.getByTestId('flipping-card');
  const prompt = await card.innerText();
  const front = await card.boundingBox();
  const restingTransform = await card.evaluate(element => getComputedStyle(element).transform);
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toBeVisible();
  await expect(card).toHaveCSS('transform', restingTransform);
  const back = await card.boundingBox();
  expect(back!.height).toBeCloseTo(front!.height, 0);
  expect(back!.width).toBeCloseTo(front!.width, 0);
  await page.getByRole('button', { name: 'Got it ✓', exact: true }).click();
  await expect(page.getByText(`CARD 2 OF ${cards.length}`, { exact: true })).toBeVisible();
  await previous.click();
  await expect(card).toHaveText(prompt, { useInnerText: true });
  await expect(previous).toBeDisabled();
});

test('long greeting fits both faces and Previous reopens the final card', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('look forward to working');
  await page.getByRole('button', { name: 'Practice 1 words →', exact: true }).click();
  const card = page.getByTestId('flipping-card');
  await expect(card).toBeVisible();
  const front = await card.boundingBox();
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('よろしくおねがいします');
  const back = await card.boundingBox();
  expect(back!.height).toBeCloseTo(front!.height, 0);
  expect(back!.width).toBeCloseTo(front!.width, 0);
  expect(await card.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true);
  await page.getByRole('button', { name: 'Got it ✓', exact: true }).click();
  await expect(page.getByText('Nicely done.')).toBeVisible();
  await page.getByRole('button', { name: '← Previous card', exact: true }).click();
  await expect(page.getByText('CARD 1 OF 1', { exact: true })).toBeVisible();
  await expect(card).toContainText('look forward to working');
});

test('preview starts practice, card turns both ways, and logo returns home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start flashcard practice', exact: true }).click();
  const entrance = page.getByTestId('practice-transition');
  await expect.poll(() => entrance.evaluate(element => Number(getComputedStyle(element).opacity))).toBeLessThan(1);
  await expect(page.getByText(`CARD 1 OF ${cards.length}`, { exact: true })).toBeVisible();
  await expect.poll(() => entrance.evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  const card = page.getByTestId('flipping-card');
  const restingTransform = await card.evaluate(element => getComputedStyle(element).transform);
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).click();
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transform)).not.toBe(restingTransform);
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText(cards[0].romaji);
  await expect.poll(() => card.evaluate(element => getComputedStyle(element).transform)).toBe(restingTransform);
  await page.getByRole('button', { name: 'Hide answer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reveal answer', exact: true })).toContainText('WRITE THE JAPANESE FOR');
  await page.getByRole('button', { name: 'Kotoba home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start flashcard practice', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await page.getByRole('button', { name: 'Kotoba home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start flashcard practice', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search vocabulary' })).toHaveCount(0);
});

test('touch swipes navigate screens and greeting searches work', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('kotoba.level.v1', 'n5'));
  await page.goto('/');
  const cdp = await context.newCDPSession(page);
  async function swipe(from: number, to: number) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y: 400 }] });
    for (let step = 1; step <= 12; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + (to - from) * step / 12, y: 400 }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await expect(page.getByRole('button', { name: `Practice ${cards.length} words →`, exact: true })).toBeEnabled();
  await swipe(350, 40);
  const search = page.getByRole('textbox', { name: 'Search vocabulary' });
  await expect(search).toBeVisible();
  // The vocabulary screen must still scroll vertically without changing pages.
  const firstWord = page.getByRole('button', { name: /^Practice .*, / }).first();
  const before = await firstWord.boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650 }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 650 - step * 30 }] });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByText('← Swipe right for home · Words')).toBeVisible();
  await expect.poll(async () => (await firstWord.boundingBox())?.y ?? -1).toBeLessThan(before!.y);
  for (const greeting of ['good morning', 'good evening', 'good night', 'goodbye', 'welcome home', 'nice to meet you', 'thank you']) {
    await search.fill(greeting);
    await expect(page.getByText('No matching words.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Practice .*, / }).first()).toBeVisible();
  }
  await search.fill('good evening');
  await expect(page.getByRole('button', { name: 'Practice こんばんは, konbanwa, good evening', exact: true })).toBeVisible();
  await search.blur();
  await swipe(40, 350);
  await expect(page.getByRole('button', { name: `Practice ${cards.length} words →`, exact: true })).toBeVisible();
  await expect(search).toHaveCount(0);
  await context.close();
});

test('practice is a deeper screen and Back restores the source word list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search vocabulary' });
  for (const query of ['hello', 'こんにちは', 'konnichiwa']) {
    await search.fill(query);
    await expect(page.getByRole('button', { name: 'Practice こんにちは, konnichiwa, hello; good afternoon', exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Practice 1 words →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Just you and the word.' })).toBeVisible();
  await expect(search).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Go to Words screen', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal answer ↻', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('konnichiwa');
  await page.getByRole('button', { name: 'Back from practice', exact: true }).click();
  await expect(search).toHaveValue('konnichiwa');
  await expect(page.getByTestId('practice-transition')).toHaveCount(0);
  await page.getByRole('button', { name: 'Practice 1 words →', exact: true }).click();
  await page.getByRole('button', { name: 'Kotoba home', exact: true }).click();
  await expect(page.getByRole('button', { name: `Practice ${cards.length} words →`, exact: true })).toBeEnabled();
});
test('search, write, reveal, complete, and retain learned words', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: `Practice ${cards.length} words →`, exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search vocabulary' });
  await search.fill('kotoba');
  await expect(page.getByRole('button', { name: 'Practice 1 words →', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Practice 言葉, kotoba, word; language', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice 1 words →', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reveal answer', exact: true })).toContainText('WRITE THE JAPANESE FOR');
  await page.getByRole('button', { name: 'Reveal answer ↻', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('ことば');
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('kotoba');
  await page.getByRole('button', { name: 'Got it ✓', exact: true }).click();
  await expect(page.getByText('Nicely done.')).toBeVisible();
  await page.getByRole('button', { name: 'Back from practice', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await expect(page.getByText('✓ Learned', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await search.fill('kotoba');
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await expect(page.getByText('✓ Learned', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'To learn', exact: true }).click();
  await expect(page.getByText('No matching words.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Practice 0 words →', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('mobile layout, kana filtering, and reading practice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Japanese first', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await page.getByRole('button', { name: 'Kana only', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('コーヒー');
  await expect(page.getByRole('button', { name: 'Practice コーヒー, koohii, coffee', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice 1 words →', exact: true }).click();
  const face = page.getByRole('button', { name: 'Reveal answer', exact: true });
  await expect(face).toContainText('コーヒー');
  await expect(face).not.toContainText('coffee');
  await face.click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('coffee');
  await page.getByRole('button', { name: 'Keep practicing', exact: true }).click();
  await expect(page.getByText('Nicely done.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to your deck', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('');
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png' });
});
