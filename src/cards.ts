import { toRomaji } from 'wanakana';
import source from '../data/n5-source.json';
import { greetings } from './greetings';
import { meaningClarifications } from './meaningClarifications';

export type Card = { id: string; word: string; reading: string; romaji: string; meaning: string; hasKanji: boolean; kind?: 'kana' };

const sourceCards: Card[] = source.map((entry, index) => {
  const reading = entry.reading || entry.word;
  return {
    id: `${entry.word}:${reading}:${index}`,
    word: entry.word,
    reading,
    romaji: toRomaji(reading),
    meaning: meaningClarifications[entry.word] ?? entry.meanings.join('; '),
    hasKanji: /[\u3400-\u9fff]/.test(entry.word),
  };
});

// Preserve existing IDs and avoid duplicating greetings already in the source.
export const cards: Card[] = [...sourceCards];
for (const [word, romaji, meaning] of greetings) {
  const existing = cards.find(card => card.word === word || card.reading === word);
  if (existing) {
    existing.romaji = romaji;
    existing.meaning = meaning;
  } else {
    cards.push({ id: `supplement:${word}`, word, reading: word, romaji, meaning, hasKanji: false });
  }
}
