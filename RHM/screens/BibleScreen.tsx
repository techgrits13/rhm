import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { bibleService, BibleVerseResponse } from '../services/bibleService';
import { useTheme } from '../context/ThemeContext';
import { safeGetJson } from '../utils/safeStorage';

// ─── Bible Data ──────────────────────────────────────────────────────────────

const OLD_TESTAMENT = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy',
  'Joshua','Judges','Ruth','1 Samuel','2 Samuel',
  '1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs',
  'Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations',
  'Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi',
];

const NEW_TESTAMENT = [
  'Matthew','Mark','Luke','John','Acts',
  'Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy',
  '2 Timothy','Titus','Philemon','Hebrews','James',
  '1 Peter','2 Peter','1 John','2 John','3 John',
  'Jude','Revelation',
];

// Approximate chapter counts per book
const CHAPTER_COUNTS: Record<string, number> = {
  Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,
  Joshua:24,Judges:21,Ruth:4,'1 Samuel':31,'2 Samuel':24,
  '1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,Ezra:10,
  Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,
  Ecclesiastes:12,'Song of Solomon':8,Isaiah:66,Jeremiah:52,Lamentations:5,
  Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,
  Obadiah:1,Jonah:4,Micah:7,Nahum:3,Habakkuk:3,
  Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,
  Matthew:28,Mark:16,Luke:24,John:21,Acts:28,
  Romans:16,'1 Corinthians':16,'2 Corinthians':13,Galatians:6,Ephesians:6,
  Philippians:4,Colossians:4,'1 Thessalonians':5,'2 Thessalonians':3,'1 Timothy':6,
  '2 Timothy':4,Titus:3,Philemon:1,Hebrews:13,James:5,
  '1 Peter':5,'2 Peter':3,'1 John':5,'2 John':1,'3 John':1,
  Jude:1,Revelation:22,
};

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SEARCH_HISTORY_KEY = '@bible_search_history';
const HIGHLIGHTS_KEY = '@bible_highlights';
const VERSE_CACHE_KEY = '@bible_verse_cache';
const MAX_HISTORY = 10;

type Screen = 'home' | 'books' | 'chapters' | 'verses';
type Testament = 'OT' | 'NT';

interface HighlightedText { verseRef: string; color: string }

// ─── Component ───────────────────────────────────────────────────────────────

export default function BibleScreen() {
  const { colors } = useTheme();

  // Navigation within screen
  const [screen, setScreen] = useState<Screen>('home');
  const [testament, setTestament] = useState<Testament>('OT');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(0);

  // Search
  const [reference, setReference] = useState('');
  const [verseData, setVerseData] = useState<BibleVerseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Highlights
  const [highlights, setHighlights] = useState<HighlightedText[]>([]);
  const [highlightedRef, setHighlightedRef] = useState('');

  // Verse cache for offline
  const [verseCache, setVerseCache] = useState<Record<string, BibleVerseResponse>>({});

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSearchHistory();
    loadHighlights();
    loadVerseCache();
    checkConnectivity();
  }, []);

  const checkConnectivity = async () => {
    const state = await NetInfo.fetch();
    setIsOffline(!state.isConnected);
  };

  const loadSearchHistory = async () => {
    const h = await safeGetJson<string[]>(SEARCH_HISTORY_KEY, []);
    setSearchHistory(h);
  };

  const loadHighlights = async () => {
    const h = await safeGetJson<HighlightedText[]>(HIGHLIGHTS_KEY, []);
    setHighlights(h);
  };

  const loadVerseCache = async () => {
    const cache = await safeGetJson<Record<string, BibleVerseResponse>>(VERSE_CACHE_KEY, {});
    setVerseCache(cache);
  };

  const saveToHistory = async (ref: string) => {
    const newH = [ref, ...searchHistory.filter(i => i !== ref)].slice(0, MAX_HISTORY);
    setSearchHistory(newH);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newH));
  };

  const clearHistory = async () => {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  };

  const cacheVerse = async (ref: string, data: BibleVerseResponse) => {
    const newCache = { ...verseCache, [ref]: data };
    setVerseCache(newCache);
    await AsyncStorage.setItem(VERSE_CACHE_KEY, JSON.stringify(newCache));
  };

  // ─── Search ────────────────────────────────────────────────────────────────

  const searchVerse = async (ref?: string) => {
    const searchRef = ref || reference;
    if (!searchRef.trim()) {
      setError('Please enter a Bible reference (e.g., John 3:16)');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setShowHistory(false);

      // Check cache first (offline support)
      const cacheKey = searchRef.toLowerCase().trim();
      if (verseCache[cacheKey]) {
        setVerseData(verseCache[cacheKey]);
        await saveToHistory(searchRef);
        setLoading(false);
        return;
      }

      if (isOffline) {
        setError('You are offline. This verse has not been cached yet.');
        setLoading(false);
        return;
      }

      const data = await bibleService.getVerse(searchRef);
      setVerseData(data);
      await saveToHistory(searchRef);
      await cacheVerse(cacheKey, data);
    } catch (err) {
      setError('Verse not found. Please check your reference and try again.');
      setVerseData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (ref: string) => {
    setReference(ref);
    setTimeout(() => searchVerse(ref), 100);
  };

  const shareVerse = async () => {
    if (!verseData) return;
    await Share.share({
      message: `${verseData.reference} (${verseData.translation})\n\n${verseData.text}\n\n— Shared from RHM Church App\nGet the app: https://play.google.com/store/apps/details?id=com.rhm.app&pcampaignid=web_share`,
    });
  };

  const highlightVerse = () => {
    if (!verseData) return;
    const ref = verseData.reference;
    Alert.alert('Highlight', 'Choose a colour', [
      { text: '🟡 Yellow', onPress: () => saveHighlight(ref, '#FFFF00') },
      { text: '🟢 Green',  onPress: () => saveHighlight(ref, '#90EE90') },
      { text: '🔵 Blue',   onPress: () => saveHighlight(ref, '#ADD8E6') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const saveHighlight = async (ref: string, color: string) => {
    const updated = [...highlights.filter(h => h.verseRef !== ref), { verseRef: ref, color }];
    setHighlights(updated);
    setHighlightedRef(ref);
    await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updated));
  };

  // ─── Navigation: Books → Chapter → Verses ─────────────────────────────────

  const goToBooks = (t: Testament) => {
    setTestament(t);
    setScreen('books');
    setVerseData(null);
    setError('');
  };

  const goToChapters = (book: string) => {
    setSelectedBook(book);
    setScreen('chapters');
  };

  const goToVerses = (chapter: number) => {
    setSelectedChapter(chapter);
    const ref = `${selectedBook} ${chapter}`;
    setReference(ref);
    setScreen('verses');
    setTimeout(() => searchVerse(ref), 100);
  };

  const navigateChapter = (direction: 'prev' | 'next') => {
    let newChapter = direction === 'next' ? selectedChapter + 1 : selectedChapter - 1;
    const maxChapter = CHAPTER_COUNTS[selectedBook] || 1;
    
    if (newChapter < 1 || newChapter > maxChapter) return;
    
    goToVerses(newChapter);
  };

  const goBack = () => {
    if (screen === 'verses') setScreen('chapters');
    else if (screen === 'chapters') setScreen('books');
    else setScreen('home');
  };

  // ─── Styles ────────────────────────────────────────────────────────────────

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Header / search area
    searchArea: {
      backgroundColor: colors.header,
      padding: 14,
      paddingTop: 10,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    // Offline banner
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF3CD',
      paddingVertical: 6,
      paddingHorizontal: 14,
      gap: 8,
    },
    offlineText: { fontSize: 12, color: '#856404', flex: 1 },
    // Testament Picker
    testamentPicker: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 10,
      marginBottom: 12,
      overflow: 'hidden',
    },
    testamentBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    testamentBtnActive: {
      backgroundColor: colors.primary,
    },
    testamentText: { fontSize: 14, fontWeight: '600', color: colors.secondaryText },
    testamentTextActive: { color: '#fff' },
    // Search row
    inputRow: { flexDirection: 'row', marginBottom: 10 },
    input: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      fontSize: 15,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    searchBtn: {
      width: 44, height: 44,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: 'center', alignItems: 'center',
      marginLeft: 8,
    },
    historyBtn: {
      width: 44, height: 44,
      backgroundColor: colors.accentBackground,
      borderRadius: 8,
      justifyContent: 'center', alignItems: 'center',
      marginLeft: 8,
    },
    // Quick access
    quickScroll: { flexDirection: 'row' },
    quickBtn: {
      paddingHorizontal: 14, paddingVertical: 7,
      backgroundColor: colors.accentBackground,
      borderRadius: 18, marginRight: 8,
    },
    quickBtnText: { color: colors.accent, fontSize: 13, fontWeight: '500' },
    // History dropdown
    historyBox: {
      backgroundColor: colors.card,
      borderRadius: 8, marginTop: 6,
      padding: 10, maxHeight: 180,
    },
    historyHeader: {
      flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
    },
    historyTitle: { fontSize: 13, fontWeight: 'bold', color: colors.text },
    historyItem: {
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyItemText: { fontSize: 13, color: colors.text },
    // Book grid
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center',
      padding: 14, gap: 10,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    bookCard: {
      flex: 1,
      margin: 5,
      paddingVertical: 14,
      paddingHorizontal: 6,
      backgroundColor: colors.card,
      borderRadius: 10,
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
    bookText: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
    // Chapter grid
    chapterCard: {
      flex: 1,
      margin: 5,
      aspectRatio: 1,
      backgroundColor: colors.card,
      borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
    },
    chapterText: { fontSize: 16, fontWeight: '700', color: colors.primary },
    // Verse display
    verseCard: {
      margin: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },
    verseHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 4,
    },
    verseRef: { fontSize: 19, fontWeight: '800', color: colors.primary },
    verseActions: { flexDirection: 'row', gap: 12 },
    verseTrans: { fontSize: 11, color: colors.placeholder, marginBottom: 14 },
    verseText: { fontSize: 17, lineHeight: 28, color: colors.text },
    highlighted: { backgroundColor: '#FFFF00' },
    // States
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    errorText: { fontSize: 15, color: colors.error, textAlign: 'center', marginTop: 12 },
    placeholderText: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    placeholderSub: {
      fontSize: 13, color: colors.secondaryText,
      textAlign: 'center', marginTop: 6, paddingHorizontal: 20,
    },
    // Chapter Navigation
    chapterNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 30,
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      gap: 6
    },
    navBtnDisabled: {
      opacity: 0.5,
    },
    navBtnText: {
      color: colors.primary,
      fontWeight: '600',
    }
  });

  // ─── Render Screens ────────────────────────────────────────────────────────

  const books = testament === 'OT' ? OLD_TESTAMENT : NEW_TESTAMENT;
  const chapterCount = CHAPTER_COUNTS[selectedBook] || 1;
  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  const renderBooksBrowser = () => (
    <>
      <View style={s.sectionHeader}>
        <TouchableOpacity onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.sectionTitle}>{testament === 'OT' ? 'Old Testament' : 'New Testament'}</Text>
      </View>
      <FlatList
        data={books}
        keyExtractor={item => item}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.bookCard} onPress={() => goToChapters(item)}>
            <Text style={s.bookText}>{item}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 10 }}
      />
    </>
  );

  const renderChaptersBrowser = () => (
    <>
      <View style={s.sectionHeader}>
        <TouchableOpacity onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.sectionTitle}>{selectedBook}</Text>
      </View>
      <FlatList
        data={chapters}
        keyExtractor={item => String(item)}
        numColumns={5}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.chapterCard} onPress={() => goToVerses(item)}>
            <Text style={s.chapterText}>{item}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 10 }}
      />
    </>
  );

  const renderVerseView = () => {
    const isHighlighted = highlights.some(h => h.verseRef === verseData?.reference);
    const highlight = highlights.find(h => h.verseRef === verseData?.reference);
    return (
      <>
        <View style={s.sectionHeader}>
          <TouchableOpacity onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.sectionTitle}>{selectedBook} {selectedChapter}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {error && !loading && (
            <View style={s.center}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
          {verseData && !error && !loading && (
            <View>
              <View style={[s.verseCard, isHighlighted && { borderLeftWidth: 4, borderLeftColor: highlight?.color || '#FFD700' }]}>
                <View style={s.verseHeader}>
                  <Text style={s.verseRef}>{verseData.reference}</Text>
                  <View style={s.verseActions}>
                    <TouchableOpacity onPress={highlightVerse}>
                      <Ionicons name="color-fill" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={shareVerse}>
                      <Ionicons name="share-social" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={s.verseTrans}>{verseData.translation}</Text>
                <Text style={[s.verseText, isHighlighted && { backgroundColor: highlight?.color }]} selectable>
                  {verseData.text}
                </Text>
              </View>
              
              {/* Chapter Navigation Buttons */}
              {selectedBook && selectedChapter > 0 && (
                <View style={s.chapterNav}>
                  <TouchableOpacity 
                    style={[s.navBtn, selectedChapter <= 1 && s.navBtnDisabled]} 
                    onPress={() => navigateChapter('prev')}
                    disabled={selectedChapter <= 1}
                  >
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                    <Text style={s.navBtnText}>Previous</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[s.navBtn, selectedChapter >= (CHAPTER_COUNTS[selectedBook] || 1) && s.navBtnDisabled]} 
                    onPress={() => navigateChapter('next')}
                    disabled={selectedChapter >= (CHAPTER_COUNTS[selectedBook] || 1)}
                  >
                    <Text style={s.navBtnText}>Next</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </>
    );
  };

  const renderHome = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.searchArea}>
        {/* OT / NT Picker */}
        <View style={s.testamentPicker}>
          <TouchableOpacity
            style={[s.testamentBtn, testament === 'OT' && s.testamentBtnActive]}
            onPress={() => goToBooks('OT')}
          >
            <Text style={[s.testamentText, testament === 'OT' && s.testamentTextActive]}>
              📜 Old Testament
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.testamentBtn, testament === 'NT' && s.testamentBtnActive]}
            onPress={() => goToBooks('NT')}
          >
            <Text style={[s.testamentText, testament === 'NT' && s.testamentTextActive]}>
              ✝️ New Testament
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Search verse (e.g. John 3:16)"
            placeholderTextColor={colors.placeholder}
            value={reference}
            onChangeText={setReference}
            onSubmitEditing={() => searchVerse()}
            onFocus={() => setShowHistory(true)}
            returnKeyType="search"
          />
          <TouchableOpacity style={s.historyBtn} onPress={() => setShowHistory(v => !v)}>
            <Ionicons name="time-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.searchBtn} onPress={() => searchVerse()} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="search" size={20} color="#fff" />
            }
          </TouchableOpacity>
        </View>

        {/* Search history */}
        {showHistory && searchHistory.length > 0 && (
          <View style={s.historyBox}>
            <View style={s.historyHeader}>
              <Text style={s.historyTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={{ fontSize: 12, color: colors.error }}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 130 }}>
              {searchHistory.map((item, idx) => (
                <TouchableOpacity key={idx} style={s.historyItem}
                  onPress={() => { setReference(item); searchVerse(item); }}>
                  <Text style={s.historyItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick access chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll}>
          {['Psalm 23:1','John 3:16','Proverbs 3:5','Romans 8:28','Phil 4:13','Isaiah 40:31'].map(ref => (
            <TouchableOpacity key={ref} style={s.quickBtn} onPress={() => handleQuickSearch(ref)}>
              <Text style={s.quickBtnText}>{ref}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Verse result */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {error && (
          <View style={s.center}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
        {verseData && !error && (() => {
          const hl = highlights.find(h => h.verseRef === verseData.reference);
          return (
            <View style={[s.verseCard, hl && { borderLeftWidth: 4, borderLeftColor: hl.color }]}>
              <View style={s.verseHeader}>
                <Text style={s.verseRef}>{verseData.reference}</Text>
                <View style={s.verseActions}>
                  <TouchableOpacity onPress={highlightVerse}>
                    <Ionicons name="color-fill" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={shareVerse}>
                    <Ionicons name="share-social" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.verseTrans}>{verseData.translation}</Text>
              <Text style={[s.verseText, hl && { backgroundColor: hl.color }]} selectable>
                {verseData.text}
              </Text>
            </View>
          );
        })()}
        {!verseData && !error && !loading && (
          <View style={s.center}>
            <Ionicons name="book" size={80} color={colors.placeholder} />
            <Text style={s.placeholderText}>Search the Bible</Text>
            <Text style={s.placeholderSub}>
              Tap Old or New Testament to browse books, or type a reference above.
              {'\n'}Searched verses are cached for offline use.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {isOffline && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#856404" />
          <Text style={s.offlineText}>You are offline — only cached verses are available</Text>
        </View>
      )}

      {screen === 'home' && renderHome()}
      {screen === 'books' && renderBooksBrowser()}
      {screen === 'chapters' && renderChaptersBrowser()}
      {screen === 'verses' && renderVerseView()}
    </View>
  );
}
