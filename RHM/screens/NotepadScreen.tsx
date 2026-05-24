import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/AdBanner';
import { useNavigation } from '@react-navigation/native';
import { safeGetJson } from '../utils/safeStorage';

const NOTES_STORAGE_KEY = '@notes';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function NotepadScreen() {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [userId, setUserId] = useState('');

  const [displayedNotes, setDisplayedNotes] = useState<Note[]>([]);
  const [page, setPage] = useState(1);
  const NOTES_PER_PAGE = 15;

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    fetchNotes();
  };

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const loadedNotes = await safeGetJson<Note[]>(NOTES_STORAGE_KEY, []);
      const sortedNotes = loadedNotes.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(sortedNotes);

      // Initial slice
      setDisplayedNotes(sortedNotes.slice(0, NOTES_PER_PAGE));
      setPage(1);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (displayedNotes.length >= notes.length) return;

    const nextPage = page + 1;
    const nextBatch = notes.slice(0, nextPage * NOTES_PER_PAGE);
    setDisplayedNotes(nextBatch);
    setPage(nextPage);
  };

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
    } else {
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
  };

  const saveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Error', 'Please enter both title and content');
      return;
    }

    try {
      let updatedNotes: Note[];
      const now = new Date().toISOString();

      if (editingNote) {
        // Update existing note
        updatedNotes = notes.map(note =>
          note.id === editingNote.id
            ? { ...note, title: noteTitle, content: noteContent, updated_at: now }
            : note
        );
      } else {
        // Create new note
        const newNote: Note = {
          id: `note_${Date.now()}`,
          title: noteTitle,
          content: noteContent,
          created_at: now,
          updated_at: now,
        };
        updatedNotes = [newNote, ...notes];
      }

      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
      fetchNotes();
      closeModal();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const deleteNote = (note: Note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedNotes = notes.filter(n => n.id !== note.id);
              await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
              fetchNotes();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 12,
    },
    noteCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    noteCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    noteTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    noteContent: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 8,
      lineHeight: 20,
    },
    noteDate: {
      fontSize: 12,
      color: colors.placeholder,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 8,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 84,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    adContainer: {
      borderTopWidth: 1,
      borderTopColor: '#e5e5e5',
      backgroundColor: '#fff',
      paddingVertical: 4,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.modalBackground,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalBody: {
      flex: 1,
      padding: 16,
    },
    titleInput: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    contentInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footerText: {
      fontSize: 12,
      marginTop: 8,
      color: '#666',
    },
  });

  // Setup header button
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => openModal()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const renderNoteCard = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => openModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.noteCardHeader}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <TouchableOpacity onPress={() => deleteNote(item)}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
      <Text style={styles.noteContent} numberOfLines={2}>
        {item.content}
      </Text>
      <Text style={styles.noteDate}>{formatDate(item.updated_at)}</Text>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={80} color={colors.placeholder} />
      <Text style={styles.emptyText}>No notes yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to create your first note
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedNotes}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          displayedNotes.length < notes.length ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.footerText}>Loading more notes...</Text>
            </View>
          ) : null
        }
      />

      {/* Note Editor Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TouchableOpacity onPress={saveNote}>
              <Ionicons name="checkmark" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={styles.titleInput}
              placeholder="Note Title"
              placeholderTextColor={colors.placeholder}
              value={noteTitle}
              onChangeText={setNoteTitle}
            />
            <TextInput
              style={styles.contentInput}
              placeholder="Note content..."
              placeholderTextColor={colors.placeholder}
              value={noteContent}
              onChangeText={setNoteContent}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>
      <View style={styles.adContainer}>
        <AdBanner />
      </View>
    </View>
  );
}