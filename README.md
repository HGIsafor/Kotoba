# Kotoba

A quiet home for Japanese flashcards, built with Expo and React Native.

Run `npm install`, then `npm start` for Expo or `npm run web` for the browser.

The default level is **Kana basics**, a starter step before N5: 46 basic hiragana
characters and 46 basic katakana characters in separate decks. Practice a single
character against its romanized sound, such as か ↔ ka or キ ↔ ki. Choose sound
first or character first. These are sounds, not English word meanings. This
starter deck does not yet include voiced sounds or combined kana.

Click the top-right notebook / level badge to open the level popup. Choose Kana
basics or N5 vocabulary; unavailable higher levels are not listed. Switching
levels during practice returns to Home for the new deck without losing progress.
The selected level and script are saved. Progress counts and learned-card lists
apply to the selected deck; switching decks preserves all other progress.

Switch to **N5 vocabulary** for 698 beginner vocabulary cards with Japanese spelling, kana
reading, romanization, and English meanings. Swipe left from Home to the
Words screen, and swipe right to return. Page dots also support mouse and keyboard
navigation. Each screen keeps its scroll position.
The Kotoba name and icon stay in a shared fixed header across every screen.
Use “Review learned cards” on Home or the “Learned” filter in Words to browse,
search, and practice saved learned cards. “Keep practicing” removes a card from
the learned group.

Tapping the preview card or a practice button opens a dedicated practice screen
with a forward zoom transition. Back reverses the transition and returns to the
screen you started from, preserving its search and scroll position. Android's
Back button and Escape on the web also leave practice. The Kotoba logo returns
to Home. The word-list pager is hidden while practicing.
Search across all four fields,
filter kanji/kana or unlearned words, and practice in order or shuffle the deck.
The “Show first” selector on Home and in practice lets you choose English first
or Japanese first, and saves that preference on the device. The Japanese side
shows the word, reading, and romanization; the English side shows its meaning.
Flip the card and choose “Got it”
or “Keep practicing”. Learned words are saved locally on the device.
There is no handwriting recognition or on-screen drawing pad.

Vocabulary comes from [OpenJLPT](https://github.com/evanclan/OpenJLPT),
downloaded September 26, 2026, with upstream attribution and license in
[data/NOTICE.md](data/NOTICE.md) and [data/LICENSE](data/LICENSE).
The bundled source is unchanged; the app fills blank kana readings with the
kana word itself, joins meanings, and generates romanization with WanaKana.
The source and any adapted vocabulary data are licensed CC BY-SA 4.0.
Ambiguous duplicate English meanings are clarified in `src/meaningClarifications.ts`
with grammatical or usage cues, visible in both writing prompts and answers.
For example, あそこ points to a distant place, while あっち casually points in
a distant direction. Existing card IDs and learned progress are preserved.
The deck adds 36 common beginner greetings and polite expressions to the 662
imported N5 words. These include morning/evening/night greetings, introductions,
farewells, homecoming phrases, thanks, apologies, meal expressions, and casual
and polite variants. Romanization is explicit for expressions such as
こんにちは (konnichiwa) and こんばんは (konbanwa).
Example sentences are retained in the source file but are not displayed.

N5 labels are community study assignments, not an official exhaustive exam list.
N5 vocabulary can use kanji above the N5 kanji level. Kana are phonetic
characters, while words spelled with kana still have meanings.

Validation: `npx tsc --noEmit`, `npx expo install --check`, and
`npx expo export --platform web --platform android --platform ios`.
Run `npx playwright test` for browser checks covering practice, search, filters,
saved progress, and mobile layout (install Chromium with `npx playwright install chromium`
if needed).
