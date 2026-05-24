import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bibleService, BibleVerseResponse } from '../services/bibleService';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/AdBanner';

const SEARCH_HISTORY_KEY = '@bible_search_history';
const HIGHLIGHTS_KEY = '@bible_highlights';
const MAX_HISTORY_ITEMS = 10;

interface HighlightedText {
  verseRef: string;
  highlightedText: string;
  color: string;
}

export default function BibleScreen() {
  const { colors } = useTheme();
  const [reference, setReference] = useState('');
  const [verseData, setVerseData] = useState<BibleVerseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [highlights, setHighlights] = useState<HighlightedText[]>([]);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    loadSearchHistory();
    loadHighlights();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        try {
          setSearchHistory(JSON.parse(stored));
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          setSearchHistory([]);
        }
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const saveToHistory = async (ref: string) => {
    try {
      const newHistory = [ref, ...searchHistory.filter(item => item !== ref)].slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const loadHighlights = async () => {
    try {
      const stored = await AsyncStorage.getItem(HIGHLIGHTS_KEY);
      if (stored) {
        try {
          setHighlights(JSON.parse(stored));
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          setHighlights([]);
        }
      }
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  };

  const saveHighlight = async (text: string, color: string) => {
    if (!verseData) return;

    try {
      const newHighlight: HighlightedText = {
        verseRef: verseData.reference,
        highlightedText: text,
        color: color,
      };
      const updatedHighlights = [...highlights, newHighlight];
      setHighlights(updatedHighlights);
      await AsyncStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updatedHighlights));
      Alert.alert('Success', 'Text highlighted and saved!');
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }
  };

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
      const data = await bibleService.getVerse(searchRef);
      setVerseData(data);
      await saveToHistory(searchRef);
    } catch (err) {
      setError('Verse not found. Please check your reference and try again.');
      setVerseData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (ref: string) => {
    setReference(ref);
    setTimeout(() => {
      searchVerse(ref);
    }, 100);
  };

  const shareVerse = async () => {
    if (!verseData) return;

    try {
      await Share.share({
        message: `${verseData.reference} (${verseData.translation})\n\n${verseData.text}\n\n— Shared from RHM Church App`,
      });
    } catch (error) {
      console.error('Error sharing verse:', error);
    }
  };

  const handleTextSelection = () => {
    if (!verseData) return;

    Alert.alert(
      'Highlight Text',
      'Choose a highlight color',
      [
        {
          text: 'Yellow',
          onPress: () => saveHighlight(verseData.text, '#FFFF00'),
        },
        {
          text: 'Green',
          onPress: () => saveHighlight(verseData.text, '#90EE90'),
        },
        {
          text: 'Blue',
          onPress: () => saveHighlight(verseData.text, '#ADD8E6'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      backgroundColor: colors.header,
      padding: 16,
      paddingTop: 12,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    searchButton: {
      width: 48,
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    historyButton: {
      width: 48,
      height: 48,
      backgroundColor: colors.accentBackground,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    quickAccessContainer: {
      flexDirection: 'row',
    },
    quickButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.accentBackground,
      borderRadius: 20,
      marginRight: 8,
    },
    quickButtonText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '500',
    },
    historyContainer: {
      backgroundColor: colors.card,
      borderRadius: 8,
      marginTop: 8,
      padding: 12,
      maxHeight: 200,
    },
    historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
    },
    clearHistoryButton: {
      fontSize: 12,
      color: colors.error,
    },
    historyItem: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyItemText: {
      fontSize: 14,
      color: colors.text,
    },
    resultContainer: {
      flex: 1,
    },
    resultContent: {
      padding: 16,
    },
    verseContainer: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    verseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    verseReference: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    verseTranslation: {
      fontSize: 12,
      color: colors.placeholder,
      marginBottom: 16,
    },
    verseText: {
      fontSize: 18,
      lineHeight: 28,
      color: colors.text,
    },
    highlightedVerse: {
      backgroundColor: '#FFFF00',
      padding: 4,
    },
    errorContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    errorText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    placeholderContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    placeholderText: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    placeholderSubtext: {
      marginTop: 8,
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    adContainer: {
      borderTopWidth: 1,
      borderTopColor: '#e5e5e5',
      backgroundColor: '#fff',
      paddingVertical: 4,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Verses (e.g., John 3:16)"
            placeholderTextColor={colors.placeholder}
            value={reference}
            onChangeText={setReference}
            onSubmitEditing={() => searchVerse()}
            onFocus={() => setShowHistory(true)}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Ionicons name="time-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => searchVerse()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search History */}
        {showHistory && searchHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryButton}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 150 }}>
              {searchHistory.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => {
                    setReference(item);
                    searchVerse(item);
                  }}
                >
                  <Text style={styles.historyItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Access Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickAccessContainer}
        >
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSearch('Psalm 23:1')}
          >
            <Text style={styles.quickButtonText}>Psalm 23</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSearch('John 3:16')}
          >
            <Text style={styles.quickButtonText}>John 3:16</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSearch('Proverbs 3:5-6')}
          >
            <Text style={styles.quickButtonText}>Proverbs 3:5-6</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSearch('Romans 8:28')}
          >
            <Text style={styles.quickButtonText}>Romans 8:28</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickButton}
            onPress={() => handleQuickSearch('Philippians 4:13')}
          >
            <Text style={styles.quickButtonText}>Phil 4:13</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {verseData && !error && (
          <View style={styles.verseContainer}>
            <View style={styles.verseHeader}>
              <Text style={styles.verseReference}>{verseData.reference}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={handleTextSelection}>
                  <Ionicons name="color-fill" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={shareVerse}>
                  <Ionicons name="share-social" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.verseTranslation}>{verseData.translation}</Text>
            <Text
              style={styles.verseText}
              selectable
            >
              {verseData.text}
            </Text>
          </View>
        )}

        {!verseData && !error && !loading && (
          <View style={styles.placeholderContainer}>
            <Ionicons name="book" size={80} color={colors.placeholder} />
            <Text style={styles.placeholderText}>
              Search for any Bible Verses
            </Text>
            <Text style={styles.placeholderSubtext}>
              Enter a reference like "John 3:16" or use the quick access buttons above.
              Your search history will be saved locally.
            </Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
    </KeyboardAvoidingView>
  );
}
