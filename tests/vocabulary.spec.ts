import { test, expect } from '@playwright/test';
import { cards } from '../src/cards';
import source from '../data/n5-source.json';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kotoba.level.v1', 'n5'));
});

test('writing prompts have distinct meanings and preserve imported progress IDs', () => {
  const prompts = new Map<string, string[]>();
  for (const card of cards) {
    const key = card.meaning.trim().toLowerCase();
    prompts.set(key, [...(prompts.get(key) ?? []), card.word]);
  }
  expect([...prompts].filter(([, words]) => words.length > 1)).toEqual([]);
  for (const [index, entry] of source.entries()) {
    expect(cards[index].id).toBe(`${entry.word}:${entry.reading || entry.word}:${index}`);
  }
});

test('over-there distinctions are visible in search and writing practice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Go to Words screen', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search vocabulary' }).fill('over there');
  await expect(page.getByRole('button', { name: /Practice あそこ, asoko,.*a place far/ })).toBeVisible();
  const direction = page.getByRole('button', { name: /Practice あっち, atchi,.*casual direction/ });
  await expect(direction).toBeVisible();
  await direction.click();
  await expect(page.getByRole('button', { name: 'Reveal answer', exact: true })).toContainText('casual direction');
  await page.getByRole('button', { name: 'Reveal answer ↻', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hide answer', exact: true })).toContainText('あっち');
});
