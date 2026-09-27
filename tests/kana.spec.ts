import { test, expect } from '@playwright/test';
import { hiraganaCards, katakanaCards } from '../src/kana';

test('basic kana decks contain 46 unique characters each', () => {
  for (const deck of [hiraganaCards, katakanaCards]) {
    expect(deck).toHaveLength(46);
    expect(new Set(deck.map(card => card.id)).size).toBe(46);
    expect(deck.every(card => card.word.length === 1 && card.romaji && card.kind === 'kana')).toBe(true);
  }
  expect(hiraganaCards.find(card => card.word === 'か')?.romaji).toBe('ka');
  expect(hiraganaCards.find(card => card.word === 'き')?.romaji).toBe('ki');
  expect(katakanaCards.find(card => card.word === 'キ')?.romaji).toBe('ki');
});

test('kana is the default and character practice hides the sound until flipped', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Hiragana', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Practice 46 characters →', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Character first', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('か');
  await page.getByRole('button', { name: 'Practice か, ka, ka', exact: true }).click();
  let face = page.getByRole('button', { name: 'Reveal answer', exact: true });
  await expect(face).toContainText('か');
  await expect(face).not.toContainText('ka');
  await face.click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('ka');
  await page.getByRole('button', { name: 'Got it ✓', exact: true }).click();
  await page.getByRole('button', { name: 'Kotoba home', exact: true }).click();
  await page.getByRole('button', { name: 'Review learned cards', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Practice か, ka, ka', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Katakana', exact: true }).click();
  await page.getByRole('button', { name: 'Learned', exact: true }).click();
  await expect(page.getByText('No learned cards yet.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Katakana', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Choose level', exact: true }).click();
  await page.getByRole('button', { name: 'N5 vocabulary', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Practice 698 words →', exact: true })).toBeEnabled();
  await page.reload();
  await page.getByRole('button', { name: 'Choose level', exact: true }).click();
  await expect(page.getByRole('button', { name: 'N5 vocabulary', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('header popup switches levels and can be dismissed without leaving practice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start flashcard practice', exact: true }).click();
  const picker = page.getByRole('button', { name: 'Choose level', exact: true });
  await picker.click();
  await expect(page.getByRole('button', { name: 'Kana basics', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Choose your level', exact: true })).toHaveCount(0);
  await expect(page.getByText('CARD 1 OF 46', { exact: true })).toBeVisible();
  await picker.click();
  await page.getByRole('button', { name: 'N5 vocabulary', exact: true }).click();
  await expect(page.getByTestId('practice-transition')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Practice 698 words →', exact: true })).toBeEnabled();
  await expect(picker).toContainText('N5');
  await picker.click();
  await page.getByRole('button', { name: 'Kana basics', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Practice 46 characters →', exact: true })).toBeEnabled();
});
