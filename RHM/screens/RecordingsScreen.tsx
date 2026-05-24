import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { recordingService, Recording } from '../services/recordingService';
import { useTheme } from '../context/ThemeContext';
import AdBanner from '../components/AdBanner';

export default function RecordingsScreen() {
    const { colors } = useTheme();
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [totalStorage, setTotalStorage] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const [displayedRecordings, setDisplayedRecordings] = useState<Recording[]>([]);
    const [page, setPage] = useState(1);
    const MESSAGES_PER_PAGE = 15;

    useEffect(() => {
        loadRecordings();
        return () => {
            sound?.unloadAsync();
        };
    }, []);

    const loadRecordings = async () => {
        try {
            setLoading(true);
            const recs = await recordingService.getAllRecordings();
            setRecordings(recs);
            // Initial slice
            setDisplayedRecordings(recs.slice(0, MESSAGES_PER_PAGE));
            setPage(1);

            const storage = await recordingService.getTotalStorageUsed();
            setTotalStorage(storage);
        } catch (error) {
            console.error('Failed to load recordings:', error);
            Alert.alert('Error', 'Failed to load recordings');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (displayedRecordings.length >= recordings.length) return;

        const nextPage = page + 1;
        const nextBatch = recordings.slice(0, nextPage * MESSAGES_PER_PAGE);
        setDisplayedRecordings(nextBatch);
        setPage(nextPage);
    };

    const playRecording = async (recording: Recording) => {
        try {
            // Stop current playback if any
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
                setPlayingId(null);
            }

            // If clicking the same recording, just stop
            if (playingId === recording.id) {
                return;
            }

            // Configure audio mode for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Load and play
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: recording.uri },
                { shouldPlay: true },
                (status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        setPlayingId(null);
                        newSound.unloadAsync();
                        setSound(null);
                    }
                }
            );

            setSound(newSound);
            setPlayingId(recording.id);
        } catch (error) {
            console.error('Failed to play recording:', error);
            Alert.alert('Error', 'Failed to play recording');
        }
    };

    const stopPlayback = async () => {
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
            setPlayingId(null);
        }
    };

    const deleteRecording = (recording: Recording) => {
        Alert.alert(
            'Delete Recording',
            'Are you sure you want to delete this recording? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (playingId === recording.id) {
                                await stopPlayback();
                            }
                            await recordingService.deleteRecording(recording.id);
                            await loadRecordings();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete recording');
                        }
                    },
                },
            ]
        );
    };

    const startEditTitle = (recording: Recording) => {
        setEditingId(recording.id);
        setEditTitle(recording.title || '');
    };

    const saveTitle = async () => {
        if (!editingId) return;
        try {
            await recordingService.updateRecordingTitle(editingId, editTitle.trim());
            await loadRecordings();
            setEditingId(null);
            setEditTitle('');
        } catch (error) {
            Alert.alert('Error', 'Failed to update title');
        }
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

    const renderRecording = ({ item }: { item: Recording }) => {
        const isPlaying = playingId === item.id;

        return (
            <View style={[styles.recordingCard, { backgroundColor: colors.card }]}>
                <View style={styles.recordingHeader}>
                    <Ionicons name="musical-notes" size={24} color={colors.primary} />
                    <View style={styles.recordingInfo}>
                        <Text style={[styles.recordingTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title || `Recording ${formatDate(item.createdAt)}`}
                        </Text>
                        <Text style={[styles.recordingMeta, { color: colors.secondaryText }]}>
                            {recordingService.formatDuration(item.duration)} • {recordingService.formatBytes(item.size)}
                        </Text>
                        <Text style={[styles.recordingDate, { color: colors.secondaryText }]}>
                            {formatDate(item.createdAt)}
                        </Text>
                    </View>
                </View>

                <View style={styles.recordingActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: isPlaying ? '#ff6b6b' : colors.primary }]}
                        onPress={() => isPlaying ? stopPlayback() : playRecording(item)}
                    >
                        <Ionicons name={isPlaying ? 'stop' : 'play'} size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>{isPlaying ? 'Stop' : 'Play'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => startEditTitle(item)}
                    >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => deleteRecording(item)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="mic-off-outline" size={64} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No Recordings Yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.secondaryText }]}>
                Go to the Radio tab and tap the record button to save your favorite sermons and songs!
            </Text>
        </View>
    );

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            padding: 16,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
        },
        storageInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        storageText: {
            fontSize: 14,
            color: colors.secondaryText,
        },
        listContent: {
            padding: 16,
        },
        recordingCard: {
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
        },
        recordingHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 12,
            gap: 12,
        },
        recordingInfo: {
            flex: 1,
        },
        recordingTitle: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
        },
        recordingMeta: {
            fontSize: 13,
            marginBottom: 2,
        },
        recordingDate: {
            fontSize: 12,
        },
        recordingActions: {
            flexDirection: 'row',
            gap: 8,
        },
        actionButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            gap: 6,
        },
        secondaryButton: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
        },
        actionButtonText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 14,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60,
            paddingHorizontal: 40,
        },
        emptyText: {
            fontSize: 18,
            fontWeight: 'bold',
            marginTop: 16,
            marginBottom: 8,
        },
        emptySubtext: {
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
            width: '80%',
            maxWidth: 400,
        },
        modalTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 16,
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            color: colors.text,
            marginBottom: 16,
        },
        modalButtons: {
            flexDirection: 'row',
            gap: 12,
        },
        modalButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        cancelButton: {
            backgroundColor: colors.border,
        },
        saveButton: {
            backgroundColor: colors.primary,
        },
        modalButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        adContainer: {
            borderTopWidth: 1,
            borderTopColor: '#e5e5e5',
            backgroundColor: '#fff',
            paddingVertical: 4,
        },
    });

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Recordings</Text>
                <View style={styles.storageInfo}>
                    <Ionicons name="folder-outline" size={16} color={colors.secondaryText} />
                    <Text style={styles.storageText}>
                        {recordings.length} recording{recordings.length !== 1 ? 's' : ''} • {recordingService.formatBytes(totalStorage)}
                    </Text>
                </View>
            </View>

            <FlatList
                data={recordings}
                renderItem={renderRecording}
                keyExtractor={(item) => item.id}
                contentContainerStyle={recordings.length === 0 ? { flex: 1 } : styles.listContent}
                ListEmptyComponent={renderEmpty}
            />

            <View style={styles.adContainer}>
                <AdBanner />
            </View>

            {/* Edit Title Modal */}
            <Modal visible={editingId !== null} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Recording Title</Text>
                        <TextInput
                            style={styles.input}
                            value={editTitle}
                            onChangeText={setEditTitle}
                            placeholder="Enter title..."
                            placeholderTextColor={colors.secondaryText}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setEditingId(null);
                                    setEditTitle('');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={saveTitle}
                            >
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
