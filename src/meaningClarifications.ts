// Original teaching glosses for ambiguous imported prompts (CC BY-SA 4.0).
// These describe useful beginner distinctions, not every possible sense.
export const meaningClarifications: Record<string, string> = {
  'あそこ': 'over there (a place far from both of us)',
  'あっち': 'over there; that way (casual direction)',
  'あちら': 'over there; that way (polite direction)',
  'そちら': 'over by you; your way (polite)',
  'そっち': 'over by you; your way (casual)',
  '向こう': 'the far side; across from here',
  'ここ': 'here (a place near the speaker)',
  'そこ': 'there (a place near the listener)',
  'こちら': 'this way; this person (polite)',
  'こっち': 'this way (casual)',
  'あれ': 'that one over there (without naming the thing)',
  'あの': 'that (noun) over there',
  'その': 'that (noun) near you',
  'それ': 'that one near you (without naming the thing)',
  'この': 'this (noun) here',
  'これ': 'this one here (without naming the thing)',
  'どっち': 'which of two; which way (casual)',
  'どちら': 'which of two; which way (polite)',
  'どの': 'which (noun)?',
  'どれ': 'which one (of three or more, without naming the thing)',
  'ええ': 'yes (a conversational way to agree)',
  'はい': 'yes (standard polite reply)',
  'お風呂': 'bath (with the polite “o” at the start)',
  'ふろ': 'bath (plain form, without the polite “o”)',
  'ください': 'please (asking someone to give or do something)',
  'どうぞ': 'please; go ahead (offering or inviting)',
  'する': 'to do (the usual, neutral word)',
  'やる': 'to do (a more informal word)',
  'ゼロ': 'zero (borrowed word, written in katakana)',
  '零': 'zero (written with the kanji for zero)',
  'たいへん': 'very; terribly (strong emphasis); difficult',
  'とても': 'very (as in “very hot” or “very good”)',
  'たくさん': 'a lot; many (as in “a lot of books”)',
  '多い': 'many; numerous (as in “the books are numerous”)',
  'どなた': 'who (polite)',
  '誰': 'who (plain)',
  'まずい': 'bad-tasting; awkward',
  '嫌': 'disliked; unwanted',
  'みんな': 'everyone (everyday speech)',
  '皆さん': 'everyone (polite)',
  '近い': 'near; close (as in “the station is close”)',
  '近く': 'nearby; the area close by',
  '午前': 'a.m.; before noon',
  '朝': 'morning (early day)',
  '字引': 'dictionary (traditional term)',
  '辞書': 'dictionary (standard term)',
  '小さい': 'small (can also say “it is small”)',
  '小さな': 'small (noun)',
  '大きい': 'big (can also say “it is big”)',
  '大きな': 'big (noun)',
  '晩': 'evening (late day)',
  '夜': 'night (after dark)',
  '夕方': 'early evening (around sunset)',
};

for (const [noun, adjective, meaning] of [
  ['黄色', '黄色い', 'yellow'], ['黒', '黒い', 'black'],
  ['青', '青い', 'blue'], ['赤', '赤い', 'red'], ['白', '白い', 'white'],
]) {
  meaningClarifications[noun] = `${meaning} (the name of the color)`;
  meaningClarifications[adjective] = `${meaning} (describing something, like a ${meaning} shirt)`;
}

for (const [number, counter, meaning] of [
  ['一', '一つ', 'one'], ['二', '二つ', 'two'], ['三', '三つ', 'three'],
  ['四', '四つ', 'four'], ['五', '五つ', 'five'], ['六', '六つ', 'six'],
  ['七', '七つ', 'seven'], ['八', '八つ', 'eight'], ['九', '九つ', 'nine'],
]) {
  meaningClarifications[number] = `${meaning} (the number itself)`;
  meaningClarifications[counter] = `${meaning} ${meaning === 'one' ? 'item' : 'items'} (for counting things)`;
}
