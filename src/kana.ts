import { toKatakana } from 'wanakana';
import type { Card } from './cards';

// The 46 basic characters in each modern kana syllabary, in gojuon order.
const rows = [
  ['あいうえお', ['a', 'i', 'u', 'e', 'o']],
  ['かきくけこ', ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['さしすせそ', ['sa', 'shi', 'su', 'se', 'so']],
  ['たちつてと', ['ta', 'chi', 'tsu', 'te', 'to']],
  ['なにぬねの', ['na', 'ni', 'nu', 'ne', 'no']],
  ['はひふへほ', ['ha', 'hi', 'fu', 'he', 'ho']],
  ['まみむめも', ['ma', 'mi', 'mu', 'me', 'mo']],
  ['やゆよ', ['ya', 'yu', 'yo']],
  ['らりるれろ', ['ra', 'ri', 'ru', 're', 'ro']],
  ['わをん', ['wa', 'wo', 'n']],
] as const;

function makeKana(script: 'hiragana' | 'katakana'): Card[] {
  return rows.flatMap(([characters, sounds]) => [...characters].map((character, index) => {
    const word = script === 'hiragana' ? character : toKatakana(character);
    const romaji = sounds[index];
    return { id: `kana:${script}:${word}`, word, reading: word, romaji,
      meaning: romaji === 'wo' ? 'wo (usually pronounced o)' : romaji,
      hasKanji: false, kind: 'kana' };
  }));
}

export const hiraganaCards = makeKana('hiragana');
export const katakanaCards = makeKana('katakana');
