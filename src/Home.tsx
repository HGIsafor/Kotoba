import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, FlatList, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cards as vocabularyCards, type Card } from './cards';
import { hiraganaCards, katakanaCards } from './kana';
import FlipCard from './FlipCard';

const STORAGE_KEY = 'kotoba.known.v1';
const FIRST_SIDE_KEY = 'kotoba.firstSide.v1';
const LEVEL_KEY = 'kotoba.level.v1';
const SCRIPT_KEY = 'kotoba.script.v1';
const allCards = [...vocabularyCards, ...hiraganaCards, ...katakanaCards];
const green = '#24594e';
type Filter = 'All words' | 'With kanji' | 'Kana only' | 'To learn' | 'Learned';

function Button({ label, onPress, primary = false, disabled = false }: { label: string; onPress: () => void; primary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, primary && styles.primaryButton, disabled && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}><Text style={[styles.buttonText, primary && { color: '#fff' }]}>{label}</Text></Pressable>;
}

export default function Home() {
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const list = useRef<FlatList<Card>>(null);
  const pager = useRef<ScrollView>(null);
  const root = useRef<View>(null);
  const [tab, setTab] = useState<'Home' | 'Words'>('Home');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All words');
  const [known, setKnown] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [session, setSession] = useState<Card[] | null>(null);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [writing, setWriting] = useState(true);
  const [sources, setSources] = useState(false);
  const [level, setLevel] = useState<'kana' | 'n5'>('kana');
  const [levelMenuOpen, setLevelMenuOpen] = useState(false);
  const [script, setScript] = useState<'hiragana' | 'katakana'>('hiragana');
  const kana = level === 'kana';
  const cards = kana ? script === 'hiragana' ? hiraganaCards : katakanaCards : vocabularyCards;
  const learnedCount = cards.filter(card => known.includes(card.id)).length;
  const unit = kana ? 'characters' : 'words';
  const levelLabel = kana ? 'Kana · Starter' : 'N5 · Beginner';
  const saveQueue = useRef(Promise.resolve());
  const practiceTransition = useRef(new Animated.Value(0)).current;
  const enteringPractice = useRef(false);
  const [transitioning, setTransitioning] = useState(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !levelMenuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation();
      setLevelMenuOpen(false);
    };
    window.addEventListener('keydown', dismiss, true);
    return () => window.removeEventListener('keydown', dismiss, true);
  }, [levelMenuOpen]);
  const practiceOpen = useRef(false);
  const returnHome = useRef(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) reduceMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduceMotion.current = value; });
    return () => { mounted = false; subscription.remove(); practiceTransition.stopAnimation(); };
  }, [practiceTransition]);

  useEffect(() => {
    if (!session || !enteringPractice.current) return;
    Animated.timing(practiceTransition, {
      toValue: 1, duration: reduceMotion.current ? 0 : 380,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) { enteringPractice.current = false; setTransitioning(false); }
    });
  }, [session, practiceTransition]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(FIRST_SIDE_KEY), AsyncStorage.getItem(LEVEL_KEY), AsyncStorage.getItem(SCRIPT_KEY)]).then(([value, firstSide, savedLevel, savedScript]) => {
      setWriting(firstSide !== 'japanese');
      setLevel(savedLevel === 'n5' ? 'n5' : 'kana');
      setScript(savedScript === 'katakana' ? 'katakana' : 'hiragana');
      if (value) {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed) || !parsed.every(id => typeof id === 'string')) throw new Error('Invalid saved progress');
        setKnown(parsed.filter(id => allCards.some(card => card.id === id)));
      }
    }).catch(() => setStorageError('Saved progress could not be loaded. This session still works.')).finally(() => setReady(true));
  }, []);

  function chooseFirstSide(englishFirst: boolean) {
    setWriting(englishFirst);
    setRevealed(false);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(FIRST_SIDE_KEY, englishFirst ? 'english' : 'japanese')).catch(() => setStorageError('Your first-side preference could not be saved on this device.'));
  }

  const firstSidePicker = <View style={{ marginBottom: 18 }}>
    <Text style={styles.cardLabel}>SHOW FIRST</Text>
    <View style={styles.modeRow}>{[true, false].map(englishFirst => <Pressable
      key={String(englishFirst)} accessibilityRole="button" disabled={!ready}
      accessibilityState={{ selected: writing === englishFirst }} aria-pressed={writing === englishFirst}
      onPress={() => chooseFirstSide(englishFirst)}
      style={[styles.mode, writing === englishFirst && styles.modeActive]}
    ><Text style={[styles.modeText, writing === englishFirst && { color: green }]}>{kana ? englishFirst ? 'Sound first' : 'Character first' : englishFirst ? 'English first' : 'Japanese first'}</Text></Pressable>)}</View>
  </View>;

  function chooseDeck(nextLevel: 'kana' | 'n5', nextScript = script) {
    setLevelMenuOpen(false);
    if (session && nextLevel === level && nextScript === script) return;
    if (session) {
      enteringPractice.current = false;
      practiceOpen.current = false;
      practiceTransition.stopAnimation(); practiceTransition.setValue(0);
      setTransitioning(false); setSession(null); setPosition(0); setRevealed(false);
      goTo('Home');
    }
    setLevel(nextLevel); setScript(nextScript); setQuery(''); setFilter('All words');
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.multiSet([[LEVEL_KEY, nextLevel], [SCRIPT_KEY, nextScript]])).catch(() => setStorageError('Your selected level could not be saved on this device.'));
  }

  const deckPicker = <View style={{ marginBottom: 24 }}>
    {kana && <><Text style={[styles.body, { marginTop: 12 }]}>Before N5: learn the sounds and shapes. Kana represent sounds, not meanings.</Text><View style={styles.modeRow}>{(['hiragana', 'katakana'] as const).map(value => <Pressable key={value} accessibilityRole="button" aria-pressed={script === value} disabled={!ready} onPress={() => chooseDeck('kana', value)} style={[styles.mode, script === value && styles.modeActive]}><Text style={styles.modeText}>{value === 'hiragana' ? 'Hiragana' : 'Katakana'}</Text></Pressable>)}</View></>}
  </View>;

  function updateKnown(card: Card, value: boolean) {
    const next = value ? [...new Set([...known, card.id])] : known.filter(id => id !== card.id);
    setKnown(next);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))).then(() => setStorageError('')).catch(() => setStorageError('Progress could not be saved on this device.'));
  }

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return cards.filter(card => (filter !== 'With kanji' || card.hasKanji) && (filter !== 'Kana only' || !card.hasKanji) && (filter !== 'To learn' || !known.includes(card.id)) && (filter !== 'Learned' || known.includes(card.id)) && `${card.word} ${card.reading} ${card.romaji} ${card.meaning}`.toLowerCase().includes(text));
  }, [query, filter, known, cards]);
  const active = session?.[position];
  const finished = session !== null && !active;

  function goTo(screen: 'Home' | 'Words') {
    setTab(screen);
    pager.current?.scrollTo({ x: screen === 'Words' ? width : 0, animated: true });
  }

  function goHome() {
    if (practiceOpen.current) {
      returnHome.current = true;
      closePractice();
      return;
    }
    goTo('Home');
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }

  function closePractice() {
    enteringPractice.current = false;
    practiceTransition.stopAnimation();
    setTransitioning(true);
    Animated.timing(practiceTransition, {
      toValue: 0, duration: reduceMotion.current ? 0 : 300,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (!finished) return;
      practiceOpen.current = false;
      setSession(null);
      setPosition(0);
      setRevealed(false);
      setTransitioning(false);
      if (returnHome.current) {
        returnHome.current = false;
        goTo('Home');
        list.current?.scrollToOffset({ offset: 0, animated: false });
      }
    });
  }

  useEffect(() => {
    if (!session) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { closePractice(); return true; });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !levelMenuOpen) closePractice(); };
    if (Platform.OS === 'web') window.addEventListener('keydown', escape);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', escape);
    };
  }, [session, levelMenuOpen]);
  // Web's nested vertical scrollers can consume horizontal touch gestures.
  // Keep native paging on phones; handle browser touch coordinates explicitly.
  useEffect(() => {
    if (Platform.OS !== 'web' || !root.current) return;
    const element = root.current as unknown as HTMLElement;
    element.style.touchAction = 'pan-y';
    let origin: { x: number; y: number } | null = null;
    const begin = (event: TouchEvent) => {
      const touch = event.touches[0];
      origin = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const end = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!origin || !touch || practiceOpen.current) return;
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      origin = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx < 0 ? 'Words' : 'Home');
    };
    const cancel = () => { origin = null; };
    element.addEventListener('touchstart', begin, { passive: true, capture: true });
    element.addEventListener('touchend', end, { passive: true, capture: true });
    element.addEventListener('touchcancel', cancel, { passive: true, capture: true });
    return () => {
      element.removeEventListener('touchstart', begin, true);
      element.removeEventListener('touchend', end, true);
      element.removeEventListener('touchcancel', cancel, true);
    };
  }, [width]);

  useEffect(() => {
    pager.current?.scrollTo({ x: tab === 'Words' ? width : 0, animated: false });
  }, [width]);

  function start(deck: Card[], shuffle = false) {
    if (enteringPractice.current || !deck.length) return;
    const next = [...deck];
    if (shuffle) for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    enteringPractice.current = true;
    practiceOpen.current = true;
    returnHome.current = false;
    setTransitioning(true);
    practiceTransition.setValue(0);
    setSession(next); setPosition(0); setRevealed(false);
  }
  function advance(value: boolean) {
    if (!active || !ready) return;
    updateKnown(active, value); setPosition(position + 1); setRevealed(false);
  }

  function previousCard() {
    if (!session || position === 0 || transitioning) return;
    setPosition(index => index - 1);
    setRevealed(false);
  }

  const practiceContent = <>
        {finished ? <View style={styles.cardFace}><Text style={styles.completion}>よくできました</Text><Text style={styles.meaning}>Nicely done.</Text><Text style={styles.body}>You practiced {session.length} {unit}. Every repetition counts.</Text><Button label="Back to your deck" primary onPress={closePractice} /></View> : active ? <>
          <FlipCard key={`${active.id}:${writing}`} revealed={revealed} onFlip={() => setRevealed(value => !value)} style={styles.cardFace}>
            {showAnswer => {
              const japanese = writing ? showAnswer : !showAnswer;
              return <><Text style={styles.cardLabel}>{active.kind === 'kana' ? japanese ? 'KANA CHARACTER' : 'ROMANIZED SOUND' : japanese ? active.hasKanji ? 'JAPANESE · KANJI + KANA' : 'JAPANESE · KANA' : writing ? 'WRITE THE JAPANESE FOR' : 'ENGLISH MEANING'}</Text>
                {japanese ? <><Text style={styles.japanese}>{active.word}</Text>{active.kind !== 'kana' && <><Text style={styles.reading}>{active.reading}</Text><Text style={styles.romaji}>{active.romaji}</Text></>}</> : <Text style={styles.meaningPrompt}>{active.meaning}</Text>}
                <Text style={styles.revealHint}>{active.kind === 'kana' ? japanese ? 'Tap for the sound ↻' : 'Tap for the character ↻' : japanese ? 'Tap for the English meaning ↻' : 'Tap for the Japanese word ↻'}</Text>
              </>;
            }}
          </FlipCard>
          <View style={styles.actions}>{revealed ? <><Button label="Keep practicing" disabled={!ready} onPress={() => advance(false)} /><Button label="Got it ✓" primary disabled={!ready} onPress={() => advance(true)} /></> : <Button label="Reveal answer ↻" primary onPress={() => setRevealed(true)} />}</View>
        </> : null}
    <View style={styles.actions}><Button label="← Previous card" onPress={previousCard} disabled={position === 0 || transitioning} /></View>
  </>;

  const appHeader = <View style={[styles.fixedHeader, !wide && { paddingHorizontal: 22 }]}>
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kotoba home" onPress={goHome} style={({ pressed }) => [styles.brand, pressed && { opacity: 0.7 }]}><View style={styles.logo}><Text style={styles.logoText}>言</Text></View><Text style={styles.brandText}>kotoba<Text style={{ color: '#c57e56' }}>.</Text></Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose level" accessibilityState={{ expanded: levelMenuOpen }} disabled={!ready} onPress={() => setLevelMenuOpen(true)} style={styles.navRight}><Text style={styles.navLabel}>YOUR JAPANESE NOTEBOOK</Text><View style={styles.levelBadge}><Text style={styles.levelText}>{levelLabel} ▾</Text></View></Pressable>
    </View>
  </View>;

  const header = (screen: 'Home' | 'Words') => <>
    {kana && deckPicker}
    {screen === 'Home' && <><View style={[styles.hero, wide ? { flexDirection: 'row', alignItems: 'center' } : { paddingVertical: 24 }]}>
      <View style={{ flex: 1 }}><Text style={styles.eyebrow}>A LITTLE PRACTICE, EVERY DAY</Text><Text accessibilityRole="header" style={[styles.heading, !wide && { fontSize: 38 }]}>{kana ? 'Your first sounds.' : 'One word at a time.'}</Text><Text style={styles.intro}>{kana ? 'Start with a, i, u, e, o. Then ka, ki, ku, ke, ko.' : 'Meet your first Japanese words. Read, write, repeat.'}</Text></View>
      <View style={styles.progressBox}><View style={styles.progressTop}><Text style={styles.progressNumber}>{learnedCount}<Text style={styles.progressTotal}> / {cards.length}</Text></Text><Text style={styles.muted}>{unit} learned</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${learnedCount / cards.length * 100}%` }]} /></View><Pressable accessibilityRole="button" accessibilityLabel="Review learned cards" onPress={() => { setQuery(''); setFilter('Learned'); goTo('Words'); }}><Text style={styles.sourceLink}>Review learned cards →</Text></Pressable></View>
    </View>
    {storageError ? <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text> : null}
    <View style={[styles.studyArea, wide && { flexDirection: 'row' }]}>
      <View style={[styles.deckInfo, wide ? { width: 290 } : { display: 'none' }]}>
        <Text style={styles.eyebrow}>YOUR FIRST CHAPTER</Text><Text accessibilityRole="header" style={styles.deckTitle}>{kana ? 'The very beginning.' : 'The everyday essentials.'}</Text><Text style={styles.body}>{kana ? `Learn the 46 basic ${script} characters, one sound at a time.` : `From morning coffee to saying hello. Build your vocabulary with ${cards.length} beginner flashcards.`}</Text>
        <View style={styles.tags}>{!kana && <Text style={styles.tag}>漢 Kanji</Text>}<Text style={styles.tag}>あ Kana</Text><Text style={styles.tag}>Aa Romaji</Text></View>
        <View style={styles.tip}><Text style={styles.tipTitle}>A moment for writing</Text><Text style={styles.tipText}>{kana ? 'Hear the sound in your head. Write its character, then flip to check.' : 'Grab a notebook. Try writing the Japanese word from its meaning, then reveal the card to check.'}</Text></View>
      </View>
      <View style={styles.practice}>
        <Text style={[styles.eyebrow, { marginBottom: 18 }]}>MAKE A LITTLE PROGRESS</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Start flashcard practice" accessibilityHint="Start practicing the selected deck" disabled={!ready} onPress={() => start(cards)} style={({ pressed }) => [styles.preview, pressed && { opacity: 0.8 }]}><Text style={styles.cardLabel}>{kana ? 'A SOUND TO BEGIN WITH' : 'A WORD TO BEGIN WITH'}</Text><Text style={styles.japanese}>{kana ? script === 'hiragana' ? 'か' : 'カ' : '言葉'}</Text>{!kana && <Text style={styles.reading}>ことば</Text>}<Text style={styles.romaji}>{kana ? 'ka' : 'kotoba'}</Text>{!kana && <><View style={styles.divider} /><Text style={styles.meaning}>word; language</Text></>}<Text style={styles.revealHint}>Tap to practice →</Text></Pressable>
          {firstSidePicker}
          <View style={styles.actions}><Button label={`Practice ${cards.length} ${unit} →`} primary disabled={!ready} onPress={() => start(cards)} /><Button label="Shuffle ⇄" disabled={!ready} onPress={() => start(cards, true)} /></View>

      </View>
    </View>
    </>}
    {screen === 'Words' && <><View style={styles.libraryHeader}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>EXPLORE YOUR DECK</Text><Text accessibilityRole="header" style={styles.libraryTitle}>{kana ? 'The building blocks of Japanese.' : 'A small word, a new beginning.'}</Text></View><Text style={styles.muted}>{filtered.length} {unit}</Text></View>
    <View style={[styles.tools, wide && { flexDirection: 'row', alignItems: 'center' }]}><View style={styles.filters}>{((kana ? ['All words', 'To learn', 'Learned'] : ['All words', 'With kanji', 'Kana only', 'To learn', 'Learned']) as Filter[]).map(item => <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && { color: '#fff' }]}>{kana && item === 'All words' ? 'All characters' : item}</Text></Pressable>)}</View><TextInput accessibilityLabel="Search vocabulary" placeholder={kana ? 'Search a character or sound…' : 'Search Japanese, romaji, or meaning…'} placeholderTextColor="#85877f" value={query} onChangeText={setQuery} style={[styles.search, wide && { width: 330 }]} autoCapitalize="none" autoCorrect={false} /></View>
    <View style={[styles.actions, { marginTop: 0, marginBottom: 22 }]}><Button label={`Practice ${filtered.length} ${unit} →`} primary disabled={!ready || !filtered.length} onPress={() => start(filtered)} /><Button label="Shuffle results ⇄" disabled={!ready || !filtered.length} onPress={() => start(filtered, true)} /></View>
    </>}
  </>;

  return <View ref={root} style={styles.screen}><StatusBar style="dark" />{appHeader}<View style={{ flex: 1, overflow: 'hidden' }}><Animated.View pointerEvents={session ? 'none' : 'auto'} aria-hidden={!!session} accessibilityElementsHidden={!!session} importantForAccessibility={session ? 'no-hide-descendants' : 'auto'} style={{ flex: 1, opacity: practiceTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: practiceTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}><ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} directionalLockEnabled onMomentumScrollEnd={event => setTab(event.nativeEvent.contentOffset.x > width / 2 ? 'Words' : 'Home')} scrollEventThrottle={16} onScroll={event => { const x = event.nativeEvent.contentOffset.x; if (Math.abs(x) < 1) setTab('Home'); else if (Math.abs(x - width) < 1) setTab('Words'); }} style={{ flex: 1 }}>{(['Home', 'Words'] as const).map(screen => <View key={screen} style={{ width, flex: 1 }} aria-hidden={tab !== screen} accessibilityElementsHidden={tab !== screen} importantForAccessibility={tab === screen ? 'auto' : 'no-hide-descendants'}><FlatList ref={screen === 'Home' ? list : undefined} key={wide ? 'wide' : 'small'} data={screen === 'Words' ? filtered : []} numColumns={wide ? 3 : 1} keyExtractor={card => card.id} contentContainerStyle={[styles.page, !wide && { paddingHorizontal: 22 }]} columnWrapperStyle={wide ? { gap: 16 } : undefined} ListHeaderComponent={header(screen)} initialNumToRender={12} ListEmptyComponent={screen === 'Words' ? <View style={styles.empty}><Text style={styles.meaning}>{filter === 'Learned' && !learnedCount ? 'No learned cards yet.' : 'No matching words.'}</Text><Text style={styles.body}>{filter === 'Learned' && !learnedCount ? 'Mark a card “Got it” during practice to find it here.' : 'Try another search or choose a different filter.'}</Text></View> : null} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Practice ${item.word}, ${item.romaji}, ${item.meaning}`} onPress={() => start([item])} style={({ pressed }) => [styles.wordCard, wide && { maxWidth: '32.4%' }, pressed && { borderColor: green }]}><View style={styles.wordTop}><Text style={styles.smallLabel}>{item.hasKanji ? 'KANJI + KANA' : 'KANA'}</Text><Text style={[styles.wordStatus, known.includes(item.id) && { color: green }]}>{known.includes(item.id) ? '✓ Learned' : '↗'}</Text></View><Text style={styles.wordJapanese}>{item.word}</Text><Text style={styles.wordReading}>{item.reading} <Text style={styles.wordRomaji}>· {item.romaji}</Text></Text><Text style={styles.wordMeaning}>{item.meaning}</Text></Pressable>} ListFooterComponent={<View style={styles.footer}><Text style={styles.footerText}>Small steps. More words. Your own pace.</Text><Pressable accessibilityRole="button" onPress={() => setSources(!sources)}><Text style={styles.sourceLink}>About these decks {sources ? '−' : '+'}</Text></Pressable>{sources && <View style={styles.sourcePanel}><Text style={styles.body}>Kana basics is our starter deck before N5: 46 basic hiragana and 46 basic katakana. It is not an official JLPT level and does not yet include voiced sounds or combinations. N5 is the beginner JLPT level. It includes words written in kanji, hiragana, and katakana. Kana represent sounds; whole words have meanings. A word’s kanji can be more advanced than its N5 vocabulary level.</Text><Text style={styles.body}>This unofficial study list includes supplemental beginner greetings and polite expressions and vocabulary from OpenJLPT, based on Jonathan Waller’s level assignments and EDRDG’s JMdict / EDICT. No fixed official JLPT vocabulary list is published. Romanization uses WanaKana, with long vowels spelled out (for example, ou).</Text><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://github.com/evanclan/OpenJLPT')}><Text style={styles.sourceLink}>Vocabulary source: OpenJLPT ↗</Text></Pressable><Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://creativecommons.org/licenses/by-sa/4.0/')}><Text style={styles.sourceLink}>Dataset licensed under CC BY-SA 4.0 ↗</Text></Pressable></View>}</View>} /></View>)}</ScrollView><View style={styles.pagerNav}><Pressable accessibilityRole="button" accessibilityLabel="Go to Home screen" onPress={() => goTo('Home')} hitSlop={12}><Text style={[styles.pageDot, tab === 'Home' && { color: green }]}>●</Text></Pressable><Text style={styles.pagerHint}>{tab === 'Home' ? 'Home · swipe left for words →' : '← Swipe right for home · Words'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Go to Words screen" onPress={() => goTo('Words')} hitSlop={12}><Text style={[styles.pageDot, tab === 'Words' && { color: green }]}>●</Text></Pressable></View></Animated.View>
    {session && <Animated.View testID="practice-transition" style={[StyleSheet.absoluteFill, styles.screen, { opacity: practiceTransition, transform: [{ scale: practiceTransition.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }, { translateY: practiceTransition.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
      <ScrollView contentContainerStyle={styles.practicePage}>
        <View style={styles.practiceNavigation}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back from practice" onPress={closePractice} hitSlop={12}><Text style={styles.link}>← Back to {tab === 'Words' ? 'words' : 'home'}</Text></Pressable>

        </View>
        <View style={styles.practiceStage}>
          {firstSidePicker}
          <Text style={styles.eyebrow}>{writing ? 'WRITING PRACTICE' : 'READING PRACTICE'}</Text>
          <Text accessibilityRole="header" style={styles.practiceHeading}>{finished ? 'A little more learned.' : kana ? 'One character at a time.' : 'Just you and the word.'}</Text>
          <View style={styles.practiceTop}><Text style={styles.eyebrow}>{finished ? 'SESSION COMPLETE' : `CARD ${position + 1} OF ${session.length}`}</Text><Text style={styles.muted}>{levelLabel}</Text></View>
          <View style={[styles.track, { marginBottom: 24 }]}><View style={[styles.fill, { width: `${position / session.length * 100}%` }]} /></View>
          <View pointerEvents={transitioning ? 'none' : 'auto'}>{practiceContent}</View>
          {storageError ? <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text> : null}
        </View>
      </ScrollView>
    </Animated.View>}
  </View>
    <Modal visible={levelMenuOpen} transparent animationType="fade" onRequestClose={() => setLevelMenuOpen(false)}>
      <View style={styles.modalOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss level picker" onPress={() => setLevelMenuOpen(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={styles.levelPopup}>
          <View style={styles.practiceTop}><Text accessibilityRole="header" style={styles.levelPopupTitle}>Choose your level</Text><Pressable accessibilityRole="button" accessibilityLabel="Close level picker" hitSlop={12} onPress={() => setLevelMenuOpen(false)}><Text style={styles.link}>Close ×</Text></Pressable></View>
          {(['kana', 'n5'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={value === 'kana' ? 'Kana basics' : 'N5 vocabulary'} aria-pressed={level === value} accessibilityState={{ selected: level === value }} onPress={() => chooseDeck(value)} style={[styles.levelOption, level === value && styles.modeActive]}>
            <View style={{ flex: 1 }}><Text style={styles.levelOptionTitle}>{value === 'kana' ? 'Kana basics' : 'N5 vocabulary'}</Text><Text style={styles.body}>{value === 'kana' ? 'Start here · Hiragana & katakana' : 'Beginner · Everyday words'}</Text></View>
            {level === value && <Text style={styles.link}>✓</Text>}
          </Pressable>)}
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20, 40, 30, 0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  levelPopup: { backgroundColor: '#fffefa', borderRadius: 18, padding: 24, width: '100%', maxWidth: 400 },
  levelPopupTitle: { fontSize: 21, color: green, fontWeight: '600' },
  levelOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 10, marginTop: 8 },
  levelOptionTitle: { color: green, fontWeight: '600', fontSize: 16, marginBottom: 4 },
  fixedHeader: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 48, paddingTop: Platform.OS === 'ios' ? 60 : 36, backgroundColor: '#f7f7f0' },
  practicePage: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  practiceNavigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingBottom: 24, borderBottomWidth: 1, borderColor: '#dddfd5' },
  practiceStage: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 620, alignSelf: 'center', paddingVertical: 36 },
  practiceHeading: { fontSize: 32, color: '#243f35', marginTop: 12, marginBottom: 32, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  pagerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 20, borderTopWidth: 1, borderColor: '#dddfd5' },
  pagerHint: { fontSize: 12, color: '#718174' },
  pageDot: { color: '#ccd4c6', fontSize: 18, padding: 4 },
  screen: { flex: 1, backgroundColor: '#f7f7f0' },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 48, paddingTop: 24, paddingBottom: 40 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 26, borderBottomWidth: 1, borderColor: '#dddfd5', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, logo: { width: 36, height: 36, borderRadius: 12, backgroundColor: green, justifyContent: 'center', alignItems: 'center' }, logoText: { color: '#fff', fontSize: 23 }, brandText: { fontSize: 29, fontWeight: '700', letterSpacing: -1 },
  navRight: { alignItems: 'flex-end', gap: 8 }, navLabel: { fontSize: 9, letterSpacing: 1.3, color: '#777d73' }, levelBadge: { backgroundColor: '#e8ede2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }, levelText: { color: green, fontSize: 11, fontWeight: '600' },
  hero: { paddingVertical: 40, gap: 26 }, eyebrow: { color: '#718174', fontSize: 10, fontWeight: '700', letterSpacing: 1.8 }, heading: { fontSize: 48, color: '#243f35', letterSpacing: -1.8, marginTop: 12, marginBottom: 12, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, intro: { fontSize: 15, color: '#778075', lineHeight: 24 },
  progressBox: { minWidth: 225, gap: 12 }, progressTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 18 }, progressNumber: { fontSize: 28, fontWeight: '600', color: green }, progressTotal: { fontSize: 16, color: '#90988c', fontWeight: '400' }, muted: { color: '#808778', fontSize: 12 }, track: { height: 5, backgroundColor: '#e0e5d9', borderRadius: 4, overflow: 'hidden' }, fill: { height: 5, backgroundColor: green },
  studyArea: { gap: 32, marginBottom: 46 }, deckInfo: { paddingTop: 22 }, deckTitle: { color: '#2a4438', fontSize: 34, lineHeight: 41, letterSpacing: -0.9, marginVertical: 16, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, body: { color: '#778075', fontSize: 14, lineHeight: 23 }, tags: { flexDirection: 'row', gap: 8, marginTop: 20 }, tag: { fontSize: 11, color: '#63725c', paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#dadfcf', borderRadius: 6 }, tip: { borderLeftWidth: 2, borderColor: '#bfcbaf', paddingLeft: 16, marginTop: 30 }, tipTitle: { fontSize: 13, fontWeight: '600', color: '#52674b', marginBottom: 7 }, tipText: { fontSize: 12, lineHeight: 20, color: '#818677' },
  practice: { flex: 1, padding: 22, borderRadius: 18, backgroundColor: '#edf0e5', borderWidth: 1, borderColor: '#dfe5d6' }, practiceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, link: { color: green, fontSize: 12 }, preview: { alignItems: 'center', paddingVertical: 22, backgroundColor: '#fffefa', borderRadius: 12, borderWidth: 1, borderColor: '#e2e6da' }, cardFace: { minHeight: 290, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 8, backgroundColor: '#fffefa', borderRadius: 12 }, cardLabel: { fontSize: 9, letterSpacing: 1.6, color: '#92998a', textAlign: 'center' }, japanese: { fontSize: 66, color: '#2d4c3f', marginTop: 10, textAlign: 'center' }, reading: { fontSize: 17, color: '#61785f', marginTop: 4, textAlign: 'center' }, romaji: { fontSize: 14, color: '#989d8f', marginTop: 5 }, divider: { width: 35, height: 1, backgroundColor: '#dfe4d7', marginVertical: 16 }, meaning: { fontSize: 19, color: '#334e3c', textAlign: 'center' }, meaningPrompt: { fontSize: 29, color: '#334e3c', textAlign: 'center', marginVertical: 26 }, revealHint: { color: '#9a9e90', fontSize: 11, marginTop: 16, textAlign: 'center' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 }, button: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 9, borderWidth: 1, borderColor: '#cfd9c6', minHeight: 48 }, primaryButton: { backgroundColor: green, borderColor: green }, buttonText: { color: green, fontSize: 13, fontWeight: '600' }, modeRow: { flexDirection: 'row', marginTop: 16, gap: 6 }, mode: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 6 }, modeActive: { backgroundColor: '#dce5d4' }, modeText: { fontSize: 12, color: '#818b7c' }, completion: { fontSize: 28, color: green, marginBottom: 14 },
  libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }, libraryTitle: { fontSize: 23, marginTop: 9, color: '#344c3e', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }, tools: { gap: 14, justifyContent: 'space-between', marginBottom: 22 }, filters: { flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, filter: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20 }, filterActive: { backgroundColor: green }, filterText: { fontSize: 12, color: '#7a8474' }, search: { backgroundColor: '#fffefa', borderWidth: 1, borderColor: '#e0e3d8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 12, color: '#344c3e' },
  wordCard: { flex: 1, borderRadius: 12, padding: 22, borderWidth: 1, borderColor: '#e0e4d9', backgroundColor: '#fffefa', marginBottom: 16 }, wordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, smallLabel: { fontSize: 8, color: '#939c88', letterSpacing: 1.4 }, wordStatus: { fontSize: 11, color: '#a9b29e' }, wordJapanese: { fontSize: 32, color: '#304d3f', marginBottom: 8 }, wordReading: { color: '#697d60', fontSize: 12, lineHeight: 20 }, wordRomaji: { color: '#979e8d' }, wordMeaning: { fontSize: 14, lineHeight: 21, color: '#516048', marginTop: 14 }, empty: { alignItems: 'center', padding: 40, gap: 12 }, footer: { alignItems: 'center', gap: 14, marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderColor: '#dfe3d6' }, footerText: { fontSize: 12, color: '#909887' }, sourceLink: { color: green, fontSize: 12, paddingVertical: 8 }, sourcePanel: { gap: 12, maxWidth: 700 }, error: { color: '#9b5638', marginBottom: 18, fontSize: 13 },
});
