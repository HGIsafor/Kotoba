# Vocabulary attribution

`n5-source.json` is an unchanged copy of
https://github.com/evanclan/OpenJLPT/blob/main/data/json/vocab/n5.json
downloaded 2026-09-26.

Credit: OpenJLPT; EDRDG JMdict / EDICT (readings and glosses);
Jonathan Waller (JLPT level assignments); Tatoeba (example sentences).
See NOTICE.md for source links and full attribution. The dataset is distributed
under CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/.

App adaptations: blank readings fall back to kana spelling, meanings are joined
with semicolons, and romanization is generated using WanaKana. Adapted vocabulary
data remains available under CC BY-SA 4.0.

The app also includes 36 original supplemental beginner greetings and polite
expressions in `src/greetings.ts`, under CC BY-SA 4.0. These cover greetings by
time of day, introductions, farewells, homecoming, thanks, apologies, and meal
expressions. Explicit romanizations handle pronunciation such as konnichiwa and
konbanwa. Existing source entries are matched by spelling/reading to prevent
duplicates while retaining their IDs. The upstream JSON remains unchanged.

`src/meaningClarifications.ts` supplies original beginner teaching glosses for
duplicate English meanings and related demonstratives, under CC BY-SA 4.0.
The wording distinguishes grammar, register, counting forms, and spatial usage;
it is not an exhaustive dictionary definition. IDs and source spellings are
unchanged so saved learned-card progress remains valid.

References consulted for demonstratives and dictionary terminology:
- Japan Foundation, demonstratives:
  https://www.kyozai.jpf.go.jp/kyozai/material/BTS00015/ja/render.do
- Japan Foundation, here/there/over there:
  https://www.kyozai.jpf.go.jp/kyozai/material/BTS00023/ja/render.do
- Japan Foundation, Irodori lesson 16 (casual directional forms):
  https://nd.jpf.go.jp/wp-content/uploads/2024/09/X_L16.pdf
- Musashino Shoin, Japanese dictionaries:
  https://www.musashinoshoin.co.jp/data_files/view/2765
