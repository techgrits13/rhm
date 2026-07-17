import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadBreakingNews, uploadMusicTrack, deleteBreakingNews, deleteMusicTrack, broadcastNotification, purgeStaleTokens, checkRegisteredTokens } from '../services/adminUploadService';
import api, { supabaseApi } from '../services/api';
import { musicService } from '../services/musicService';
import { registerForPushNotifications } from '../services/notificationService';

type TabType = 'news' | 'music' | 'manage' | 'push' | 'analytics';
type NewsType = 'text' | 'image' | 'video' | 'poll' | 'link';
const ADMIN_USERNAME = 'esir';
const ADMIN_PASSWORD = '12822Esir@#';

export default function AdminDashboardScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState<TabType>('news');

    return (
        <View style={styles.container}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'news' && styles.tabActive]}
                    onPress={() => setActiveTab('news')}
                >
                    <Ionicons
                        name="megaphone"
                        size={20}
                        color={activeTab === 'news' ? '#fff' : '#6200ee'}
                    />
                    <Text style={[styles.tabText, activeTab === 'news' && styles.tabTextActive]}>
                        Breaking News
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'music' && styles.tabActive]}
                    onPress={() => setActiveTab('music')}
                >
                    <Ionicons
                        name="musical-notes"
                        size={20}
                        color={activeTab === 'music' ? '#fff' : '#6200ee'}
                    />
                    <Text style={[styles.tabText, activeTab === 'music' && styles.tabTextActive]}>
                        Music
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'manage' && styles.tabActive]}
                    onPress={() => setActiveTab('manage')}
                >
                    <Ionicons
                        name="trash"
                        size={20}
                        color={activeTab === 'manage' ? '#fff' : '#6200ee'}
                    />
                    <Text style={[styles.tabText, activeTab === 'manage' && styles.tabTextActive]}>
                        Manage
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'push' && styles.tabActive]}
                    onPress={() => setActiveTab('push')}
                >
                    <Ionicons
                        name="notifications"
                        size={20}
                        color={activeTab === 'push' ? '#fff' : '#6200ee'}
                    />
                    <Text style={[styles.tabText, activeTab === 'push' && styles.tabTextActive]}>
                        Push Alerts
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'analytics' && styles.tabActive]}
                    onPress={() => setActiveTab('analytics')}
                >
                    <Ionicons
                        name="stats-chart"
                        size={20}
                        color={activeTab === 'analytics' ? '#fff' : '#6200ee'}
                    />
                    <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>
                        Stats
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => navigation.navigate('ToDoList')}
                >
                    <Ionicons name="list" size={20} color="#6200ee" />
                    <Text style={styles.tabText}>Tasks</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'news' && <BreakingNewsTab />}
            {activeTab === 'music' && <MusicTab />}
            {activeTab === 'manage' && <ManageContentTab />}
            {activeTab === 'push' && <PushAlertsTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
        </View>
    );
}

function AnalyticsTab() {
    const [loading, setLoading] = React.useState(true);
    const [metrics, setMetrics] = React.useState({
        totalUsers: 0,
        newInstallsToday: 0,
        dailyActiveUsers: 0,
    });
    const [activeWindowMinutes, setActiveWindowMinutes] = React.useState(5);
    const [errorMessage, setErrorMessage] = React.useState('');

    const fetchAnalytics = React.useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const response = await supabaseApi.get('/analytics', {
                headers: {
                    'x-admin-user': ADMIN_USERNAME,
                    'x-admin-password': ADMIN_PASSWORD,
                },
                metadata: { suppressErrorLog: true },
            });
            setMetrics(response.data?.metrics || { totalUsers: 0, newInstallsToday: 0, dailyActiveUsers: 0 });
            setActiveWindowMinutes(response.data?.windows?.activeMinutes || 5);
        } catch (error: any) {
            const status = error?.response?.status;
            const message = status === 404
                ? 'Stats endpoint not found on Supabase. Make sure the analytics Edge Function is deployed.'
                : status === 401
                    ? 'Admin credentials mismatch. Ensure credentials match the Edge Function parameters.'
                    : status === 500
                        ? (error?.response?.data?.error || 'Database error — check if app_devices and app_daily_device_activity tables exist in Supabase.')
                        : error?.message || 'Could not load app usage stats.';
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return (
        <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.analyticsScrollContent}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.analyticsHeader}>
                <Ionicons name="stats-chart-outline" size={42} color="#6200ee" />
                <Text style={styles.analyticsTitle}>App Usage</Text>
                <Text style={styles.analyticsSubtitle}>Visible only inside the hidden admin dashboard.</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 40 }} />
            ) : (
                <View style={styles.analyticsGrid}>
                    <MetricCard label="Total Users" value={metrics.totalUsers} helper="All unique devices" icon="people" />
                    <MetricCard label="New Installs" value={metrics.newInstallsToday} helper="Installs today" icon="person-add" />
                    <MetricCard label="Daily Active" value={metrics.dailyActiveUsers} helper="Active today" icon="today" />
                </View>
            )}

            {!!errorMessage && (
                <View style={styles.analyticsErrorBox}>
                    <Ionicons name="alert-circle-outline" size={20} color="#b71c1c" />
                    <Text style={styles.analyticsErrorText}>{errorMessage}</Text>
                </View>
            )}

            {!errorMessage && !loading && metrics.totalUsers === 0 && (
                <View style={styles.analyticsInfoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#1565c0" />
                    <Text style={styles.analyticsInfoText}>
                        {'Showing zeros? Possible causes:\n• Supabase analytics tables not created (run setup_analytics_schema.sql in Supabase SQL editor)\n• App tracking just started — open the app from the home screen to register the first session\n\nTracking fires automatically every time anyone opens the RHM app.'}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.debugButton, loading && styles.uploadButtonDisabled]}
                onPress={fetchAnalytics}
                disabled={loading}
            >
                <Ionicons name="refresh" size={18} color="#1565c0" />
                <Text style={styles.debugButtonText}>Refresh Stats</Text>
            </TouchableOpacity>

            {/* YouTube Sync Section */}
            <View style={styles.divider} />
            <YouTubeSyncSection />
        </ScrollView>
    );
}

function YouTubeSyncSection() {
    const [syncing, setSyncing] = React.useState(false);
    const [syncResult, setSyncResult] = React.useState<{ processed: number; message: string } | null>(null);
    const [syncError, setSyncError] = React.useState('');

    const handleYouTubeSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        setSyncError('');
        try {
            const response = await supabaseApi.post('/videos', {}, {
                headers: {
                    'x-video-sync-secret': 'rhm_video_sync_secret_2026', // Use the sync secret expected by the edge function
                },
                metadata: { suppressErrorLog: true },
            });
            if (response.data?.success) {
                setSyncResult({ processed: response.data.count, message: `Sync complete. Fetched ${response.data.count} new videos!` });
            } else {
                setSyncError(response.data?.error || 'Sync returned an error.');
            }
        } catch (error: any) {
            const msg = error?.response?.data?.error || error?.message || 'YouTube sync failed.';
            setSyncError(msg);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <View>
            <View style={styles.ytSyncHeader}>
                <Ionicons name="logo-youtube" size={28} color="#FF0000" />
                <Text style={styles.ytSyncTitle}>YouTube Sync</Text>
            </View>
            <Text style={styles.ytSyncSubtitle}>
                Force-fetch latest videos from all church channels and update the database. The scheduler auto-runs every 15 min.
            </Text>

            {!!syncResult && (
                <View style={styles.syncSuccessBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
                    <Text style={styles.syncSuccessText}>{syncResult.message}</Text>
                </View>
            )}

            {!!syncError && (
                <View style={styles.analyticsErrorBox}>
                    <Ionicons name="alert-circle-outline" size={20} color="#b71c1c" />
                    <Text style={styles.analyticsErrorText}>{syncError}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.ytSyncButton, syncing && styles.uploadButtonDisabled]}
                onPress={handleYouTubeSync}
                disabled={syncing}
            >
                {syncing ? (
                    <>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.ytSyncButtonText}>Syncing…</Text>
                    </>
                ) : (
                    <>
                        <Ionicons name="sync" size={20} color="#fff" />
                        <Text style={styles.ytSyncButtonText}>Sync YouTube Now</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

function MetricCard({ label, value, helper, icon }: { label: string; value: number; helper: string; icon: keyof typeof Ionicons.glyphMap }) {
    return (
        <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
                <Ionicons name={icon} size={22} color="#6200ee" />
            </View>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricHelper}>{helper}</Text>
        </View>
    );
}

// Breaking News Tab Component
function BreakingNewsTab() {
    const [newsType, setNewsType] = useState<NewsType>('text');
    const [content, setContent] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [uploading, setUploading] = useState(false);

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: newsType === 'image' ? ['images'] : ['videos'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setMediaUri(result.assets[0].uri);
        }
    };

    const handleUpload = async () => {
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter some content');
            return;
        }

        if (newsType === 'link' && !linkUrl.trim()) {
            Alert.alert('Error', 'Please enter a URL for the link post');
            return;
        }

        if (newsType === 'poll' && pollOptions.filter(o => o.trim()).length < 2) {
            Alert.alert('Error', 'Poll must have at least 2 options');
            return;
        }

        setUploading(true);

        const result = await uploadBreakingNews({
            type: newsType,
            content: content.trim(),
            mediaUri: mediaUri || undefined,
            pollOptions: newsType === 'poll' ? pollOptions.filter(o => o.trim()) : undefined,
            linkUrl: newsType === 'link' ? linkUrl.trim() : undefined,
        });

        setUploading(false);

        if (result.success) {
            Alert.alert('Success', 'Breaking news posted successfully!');
            setContent('');
            setMediaUri(null);
            setPollOptions(['', '']);
            setLinkUrl('');
        } else {
            Alert.alert('Upload Failed', result.error || 'Please try again');
        }
    };

    return (
        <ScrollView style={styles.tabContent}>
            {/* Type Selector */}
            <Text style={styles.label}>Post Type</Text>
            <View style={styles.typeSelector}>
                {(['text', 'image', 'video', 'poll', 'link'] as NewsType[]).map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.typeButton, newsType === type && styles.typeButtonActive]}
                        onPress={() => {
                            setNewsType(type);
                            setMediaUri(null);
                            setLinkUrl('');
                        }}
                    >
                        <Text style={[styles.typeButtonText, newsType === type && styles.typeButtonTextActive]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content Input */}
            <Text style={styles.label}>Content / Caption</Text>
            <TextInput
                style={styles.textArea}
                value={content}
                onChangeText={setContent}
                placeholder="Write your message..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
            />

            {/* Media Picker (Image/Video) */}
            {(newsType === 'image' || newsType === 'video') && (
                <>
                    <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
                        <Ionicons name="cloud-upload" size={24} color="#6200ee" />
                        <Text style={styles.mediaButtonText}>
                            {mediaUri ? 'Change Media' : `Select ${newsType === 'image' ? 'Image' : 'Video'}`}
                        </Text>
                    </TouchableOpacity>
                    {mediaUri && newsType === 'image' && (
                        <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
                    )}
                    {mediaUri && newsType === 'video' && (
                        <View style={styles.videoPreview}>
                            <Ionicons name="videocam" size={40} color="#6200ee" />
                            <Text style={styles.videoPreviewText}>Video selected</Text>
                        </View>
                    )}
                </>
            )}

            {/* Poll Options */}
            {newsType === 'poll' && (
                <>
                    <Text style={styles.label}>Poll Options</Text>
                    {pollOptions.map((option, index) => (
                        <TextInput
                            key={index}
                            style={styles.input}
                            value={option}
                            onChangeText={(text) => {
                                const newOptions = [...pollOptions];
                                newOptions[index] = text;
                                setPollOptions(newOptions);
                            }}
                            placeholder={`Option ${index + 1}`}
                        />
                    ))}
                    {pollOptions.length < 5 && (
                        <TouchableOpacity
                            style={styles.addOptionButton}
                            onPress={() => setPollOptions([...pollOptions, ''])}
                        >
                            <Ionicons name="add-circle" size={20} color="#6200ee" />
                            <Text style={styles.addOptionText}>Add Option</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* Link URL Input */}
            {newsType === 'link' && (
                <>
                    <Text style={styles.label}>URL *</Text>
                    <TextInput
                        style={styles.input}
                        value={linkUrl}
                        onChangeText={setLinkUrl}
                        placeholder="https://example.com"
                        autoCapitalize="none"
                        keyboardType="url"
                        autoCorrect={false}
                    />
                </>
            )}

            {/* Upload Button */}
            <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="send" size={20} color="#fff" />
                        <Text style={styles.uploadButtonText}>Post to Feed</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

// Music Tab Component
function MusicTab() {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [coverUri, setCoverUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickAudio = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'audio/*',
            copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
            setAudioUri(result.assets[0].uri);
        }
    };

    const pickCover = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setCoverUri(result.assets[0].uri);
        }
    };

    const handleUpload = async () => {
        if (!title.trim() || !artist.trim()) {
            Alert.alert('Error', 'Please enter title and artist');
            return;
        }

        if (!audioUri) {
            Alert.alert('Error', 'Please select an audio file');
            return;
        }

        setUploading(true);

        const result = await uploadMusicTrack({
            title: title.trim(),
            artist: artist.trim(),
            album: album.trim() || undefined,
            audioUri,
            coverUri: coverUri || undefined,
        });

        setUploading(false);

        if (result.success) {
            Alert.alert('Success', 'Music track uploaded successfully!');
            // Reset form
            setTitle('');
            setArtist('');
            setAlbum('');
            setAudioUri(null);
            setCoverUri(null);
        } else {
            Alert.alert('Upload Failed', result.error || 'Please try again');
        }
    };

    return (
        <ScrollView style={styles.tabContent}>
            {/* Title Input */}
            <Text style={styles.label}>Song Title *</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter song title"
            />

            {/* Artist Input */}
            <Text style={styles.label}>Artist *</Text>
            <TextInput
                style={styles.input}
                value={artist}
                onChangeText={setArtist}
                placeholder="Enter artist name"
            />

            {/* Album Input */}
            <Text style={styles.label}>Album (Optional)</Text>
            <TextInput
                style={styles.input}
                value={album}
                onChangeText={setAlbum}
                placeholder="Enter album name"
            />

            {/* Audio Picker */}
            <TouchableOpacity style={styles.mediaButton} onPress={pickAudio}>
                <Ionicons name="musical-note" size={24} color="#6200ee" />
                <Text style={styles.mediaButtonText}>
                    {audioUri ? 'Change Audio File' : 'Select Audio File *'}
                </Text>
            </TouchableOpacity>
            {audioUri && (
                <View style={styles.fileSelected}>
                    <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                    <Text style={styles.fileSelectedText}>Audio file selected</Text>
                </View>
            )}

            {/* Cover Picker */}
            <TouchableOpacity style={styles.mediaButton} onPress={pickCover}>
                <Ionicons name="image" size={24} color="#6200ee" />
                <Text style={styles.mediaButtonText}>
                    {coverUri ? 'Change Cover Art' : 'Select Cover Art (Optional)'}
                </Text>
            </TouchableOpacity>
            {coverUri && (
                <Image source={{ uri: coverUri }} style={styles.coverPreview} />
            )}

            {/* Upload Button */}
            <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="cloud-upload" size={20} color="#fff" />
                        <Text style={styles.uploadButtonText}>Upload Track</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

// Manage Content Tab Component
function ManageContentTab() {
    const [news, setNews] = React.useState<any[]>([]);
    const [music, setMusic] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [viewMode, setViewMode] = React.useState<'news' | 'music'>('news');

    React.useEffect(() => {
        fetchContent();
    }, [viewMode]);

    const fetchContent = async () => {
        setLoading(true);
        try {
            if (viewMode === 'news') {
                const response = await supabaseApi.get('/breaking-news');
                setNews(response.data || []);
            } else {
                const data = await musicService.getMusicPaginated({ limit: 100, offset: 0, sort: 'newest' });
                setMusic(data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: string | number, type: 'news' | 'music') => {
        Alert.alert(
            'Delete Item',
            'Are you sure you want to permanently delete this? Any attached media files will be wiped from the cloud storage bucket.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => performDelete(id, type) }
            ]
        );
    };

    const performDelete = async (id: string | number, type: 'news' | 'music') => {
        setLoading(true);
        let success = false;
        if (type === 'news') {
            const res = await deleteBreakingNews(id);
            success = res.success;
        } else {
            const res = await deleteMusicTrack(id);
            success = res.success;
        }
        
        if (success) {
            Alert.alert('Deleted', 'Item and media successfully destroyed.');
            fetchContent();
        } else {
            Alert.alert('Error', 'Failed to delete. Check console logs.');
            setLoading(false);
        }
    };

    return (
        <View style={styles.tabContent}>
            {/* Unified Toggle Switch */}
            <View style={styles.typeSelector}>
                <TouchableOpacity
                    style={[styles.typeButton, viewMode === 'news' && styles.typeButtonActive]}
                    onPress={() => setViewMode('news')}
                >
                    <Text style={[styles.typeButtonText, viewMode === 'news' && styles.typeButtonTextActive]}>
                        Breaking News
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.typeButton, viewMode === 'music' && styles.typeButtonActive]}
                    onPress={() => setViewMode('music')}
                >
                    <Text style={[styles.typeButtonText, viewMode === 'music' && styles.typeButtonTextActive]}>
                        Music Tracks
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6200ee" style={{marginTop: 40}} />
            ) : (
                <ScrollView>
                    {viewMode === 'news' && news.map((item) => (
                        <View key={item.id} style={styles.manageCard}>
                            <View style={{flex: 1}}>
                                <Text style={styles.manageDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                <Text style={styles.manageTitle} numberOfLines={2}>{item.content || item.type}</Text>
                                <Text style={styles.manageSubtext}>Files attached: {item.media_url ? 'Yes' : 'No'}</Text>
                            </View>
                            <TouchableOpacity style={styles.manageDeleteBtn} onPress={() => confirmDelete(item.id, 'news')}>
                                <Ionicons name="trash" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {viewMode === 'music' && music.map((track) => (
                        <View key={track.id} style={styles.manageCard}>
                            <View style={{flex: 1}}>
                                <Text style={styles.manageTitle} numberOfLines={1}>{track.title}</Text>
                                <Text style={styles.manageSubtext}>Artist: {track.artist}</Text>
                            </View>
                            <TouchableOpacity style={styles.manageDeleteBtn} onPress={() => confirmDelete(track.id, 'music')}>
                                <Ionicons name="trash" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    
                    {((viewMode === 'news' && news.length === 0) || (viewMode === 'music' && music.length === 0)) && (
                        <Text style={{textAlign: 'center', marginTop: 40, color: '#888'}}>No items found.</Text>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

// Push Alerts Tab Component
function PushAlertsTab() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetScreen, setTargetScreen] = useState('Home');
    const [sending, setSending] = useState(false);
    const [purging, setPurging] = useState(false);
    const [lastResult, setLastResult] = useState<{ sent: number; purged: number } | null>(null);

    const screens = [
        { label: '🏠 Home Feed', value: 'Home' },
        { label: '📻 Radio', value: 'Radio' },
        { label: '📖 Bible', value: 'Bible' },
        { label: '📰 Breaking News', value: 'BreakingNews' },
        { label: '🎵 Worship Songs', value: 'MusicList' },
    ];

    const templates = [
        { label: '☀️ Morning Service', title: '☀️ Morning Service', body: 'Join us live for our powerful morning service starting now!' },
        { label: '🙏 Special Prayer', title: '🙏 Special Prayer Night', body: 'A special prayer session is happening right now. Tap to join us.' },
        { label: '🎶 New Music', title: '🎶 New Worship Track', body: 'A brand new worship song has just been added. Come listen!' },
        { label: '📰 News Alert', title: '📰 Breaking News', body: 'There is an important announcement. Tap to read now.' },
    ];

    const handleBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Missing Info', 'Please enter both a title and a message.');
            return;
        }

        Alert.alert(
            '📣 Broadcast Alert',
            `This will notify ALL registered users.\n\nTapping the notification opens: "${targetScreen}" screen.\n\nProceed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Now', style: 'default', onPress: async () => {
                        setSending(true);
                        setLastResult(null);
                        try {
                            const res = await broadcastNotification(
                                title.trim(),
                                message.trim(),
                                { screen: targetScreen }
                            );
                            setSending(false);

                            if (res.success && (res.sent ?? 0) > 0) {
                                setLastResult({ sent: res.sent ?? 0, purged: res.purged ?? 0 });
                                setTitle('');
                                setMessage('');
                                Alert.alert(
                                    '✅ Broadcast Sent!',
                                    `✅ Delivered to ${res.sent} device(s) of ${res.total_tokens} registered.\n` +
                                    `${(res.failed ?? 0) > 0 ? `⚠️ ${res.failed} delivery failure(s).\n` : ''}` +
                                    `${(res.purged ?? 0) > 0 ? `🧹 Auto-removed ${res.purged} stale token(s).` : 'All tokens valid.'}`
                                );
                            } else if ((res.total_tokens ?? 0) === 0 || res.message?.includes('No devices')) {
                                Alert.alert(
                                    '⚠️ No Devices Registered',
                                    'No push tokens found in the database.\n\nThis means no user has opened the RHM app since it was last installed/updated. Ask users to open the app to register their device.'
                                );
                            } else if ((res.failed ?? 0) > 0 && (res.sent ?? 0) === 0) {
                                setLastResult({ sent: 0, purged: res.purged ?? 0 });
                                const errSample = res.expo_errors?.[0];
                                Alert.alert(
                                    '❌ All Deliveries Failed',
                                    `All ${res.total_tokens} token(s) were rejected by Expo.\n\n` +
                                    `Error: ${errSample?.error || 'Unknown'}\n` +
                                    `${errSample?.message || ''}\n\n` +
                                    `💡 Likely cause: All tokens are stale (old Expo Go tokens or uninstalled app). Tap “Check Registered Devices” to inspect, then tap “Clean Stale Tokens” to reset.`
                                );
                            } else if (res.error) {
                                Alert.alert('❌ Error', res.error);
                            } else {
                                // Partial success
                                setLastResult({ sent: res.sent ?? 0, purged: res.purged ?? 0 });
                                Alert.alert(
                                    '⚠️ Partial Success',
                                    `Delivered to ${res.sent} of ${res.total_tokens} device(s).\n${res.failed} failed.`
                                );
                            }
                        } catch (e: any) {
                            setSending(false);
                            Alert.alert('❌ Error', e?.message || 'Unknown error occurred');
                        }
                    }
                }
            ]
        );
    };

    const handlePurgeTokens = async () => {
        Alert.alert(
            '🧹 Clean All Test Tokens',
            'This will delete ALL push tokens. Users must re-open the RHM app to re-register. Use this only if notifications are completely broken. Proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clean Now', onPress: async () => {
                        setPurging(true);
                        try {
                            const res = await purgeStaleTokens(true);
                            if (res.success) {
                                // Re-register this exact device immediately so admin doesn't lose push capability
                                await registerForPushNotifications();
                                setPurging(false);
                                Alert.alert('✅ Done', 'All tokens removed. Your device has been re-registered. Ask other users to re-open the RHM app.');
                            } else {
                                setPurging(false);
                                Alert.alert('⚠️ Warning', res.error || 'Purge failed');
                            }
                        } catch (e: any) {
                            setPurging(false);
                            Alert.alert('Error', e?.message || 'Purge failed');
                        }
                    }
                }
            ]
        );
    };

    const handleCheckTokens = async () => {
        setPurging(true);
        try {
            const res = await checkRegisteredTokens();
            setPurging(false);
            if (res.error) {
                Alert.alert('❌ Error', res.error);
                return;
            }
            if (res.count === 0) {
                Alert.alert(
                    '⚠️ No Devices Registered',
                    'The push_tokens table is empty.\n\nThis is why broadcasts deliver 0 notifications.\n\n👉 Fix: Run the SQL fix in Supabase, then tap "Force Re-Register This Device" to confirm it works.'
                );
                return;
            }
            const tokenList = res.tokens.slice(0, 5).map(t =>
                `• ${t.token_preview}\n  Platform: ${t.device_type} | Last seen: ${new Date(t.updated_at).toLocaleDateString()}`
            ).join('\n\n');
            Alert.alert(
                `📱 ${res.count} Device(s) Registered`,
                `Showing first ${Math.min(5, res.count)}:\n\n${tokenList}`
            );
        } catch (e: any) {
            setPurging(false);
            Alert.alert('Error', e?.message || 'Failed to check tokens');
        }
    };

    const handleForceReRegister = async () => {
        Alert.alert(
            '🔄 Force Re-Register',
            'This clears the cached push token on THIS device and forces a fresh registration with Supabase. Use this to test if the push_tokens table is working after running the SQL fix.\n\nProceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Re-Register', onPress: async () => {
                        setPurging(true);
                        try {
                            // Clear cached token so a brand new one is fetched & saved
                            await AsyncStorage.removeItem('@rhm_push_token');
                            const token = await registerForPushNotifications();
                            setPurging(false);
                            if (token) {
                                Alert.alert(
                                    '✅ Registered!',
                                    `This device is now registered.\n\nToken: ${token.slice(0, 50)}...\n\nNow tap "Check Registered Devices" — you should see at least 1 device.`
                                );
                            } else {
                                Alert.alert(
                                    '❌ Registration Failed',
                                    'Could not get a push token. Make sure:\n• You are on a PHYSICAL device (not emulator)\n• Notification permission is GRANTED\n• The app was built with EAS (not Expo Go)'
                                );
                            }
                        } catch (e: any) {
                            setPurging(false);
                            Alert.alert('❌ Error', e?.message || 'Re-registration failed');
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.tabContent} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.pushHeader}>
                <Ionicons name="megaphone-outline" size={48} color="#6200ee" />
                <Text style={styles.pushTitle}>Mass Broadcast</Text>
                <Text style={styles.pushSubtitle}>Reach all RHM members instantly via push notifications.</Text>
            </View>

            {/* Last result badge */}
            {lastResult && (
                <View style={styles.resultBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                    <Text style={styles.resultText}>
                        Last sent to {lastResult.sent} device(s) · {lastResult.purged} stale token(s) removed
                    </Text>
                </View>
            )}

            {/* Title */}
            <Text style={styles.label}>Alert Title *</Text>
            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. ☀️ Service Starting Now!"
                maxLength={80}
            />

            {/* Message */}
            <Text style={styles.label}>Message Body *</Text>
            <TextInput
                style={styles.textArea}
                value={message}
                onChangeText={setMessage}
                placeholder="Write your announcement..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={300}
            />
            <Text style={styles.charCount}>{message.length}/300</Text>

            {/* Smart Templates */}
            <Text style={styles.label}>Quick Templates</Text>
            <View style={styles.screenSelector}>
                {templates.map((t, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.smallTypeBtn}
                        onPress={() => { setTitle(t.title); setMessage(t.body); }}
                    >
                        <Text style={styles.smallTypeBtnText}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Target screen */}
            <Text style={styles.label}>Opens which screen on tap?</Text>
            <View style={styles.screenSelector}>
                {screens.map((s) => (
                    <TouchableOpacity
                        key={s.value}
                        style={[styles.smallTypeBtn, targetScreen === s.value && styles.typeButtonActive]}
                        onPress={() => setTargetScreen(s.value)}
                    >
                        <Text style={[styles.smallTypeBtnText, targetScreen === s.value && styles.typeButtonTextActive]}>
                            {s.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Send button */}
            <TouchableOpacity
                style={[styles.uploadButton, sending && styles.uploadButtonDisabled]}
                onPress={handleBroadcast}
                disabled={sending}
            >
                {sending ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <Ionicons name="send" size={20} color="#fff" />
                        <Text style={styles.uploadButtonText}>Send Mass Notification</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Maintenance section */}
            <Text style={styles.label}>{'Diagnostics & Maintenance'}</Text>

            {/* NEW: Check registered devices */}
            <TouchableOpacity
                style={[styles.debugButton, purging && styles.uploadButtonDisabled]}
                onPress={handleCheckTokens}
                disabled={purging}
            >
                {purging ? (
                    <ActivityIndicator color="#1565c0" />
                ) : (
                    <>
                        <Ionicons name="phone-portrait-outline" size={18} color="#1565c0" />
                        <Text style={styles.debugButtonText}>Check Registered Devices</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Force Re-Register This Device */}
            <TouchableOpacity
                style={[styles.reregisterButton, purging && styles.uploadButtonDisabled]}
                onPress={handleForceReRegister}
                disabled={purging}
            >
                {purging ? (
                    <ActivityIndicator color="#1b5e20" />
                ) : (
                    <>
                        <Ionicons name="refresh-circle-outline" size={18} color="#1b5e20" />
                        <Text style={styles.reregisterButtonText}>🔄 Force Re-Register This Device</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.purgeButton, purging && styles.uploadButtonDisabled]}
                onPress={handlePurgeTokens}
                disabled={purging}
            >
                {purging ? (
                    <ActivityIndicator color="#e53935" />
                ) : (
                    <>
                        <Ionicons name="trash-outline" size={18} color="#e53935" />
                        <Text style={styles.purgeButtonText}>Reset All Tokens (Nuclear Option)</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Info box */}
            <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                    {`Notifications are sent via Expo's push service scoped to the RHM app (com.rhm.app).\n\n💡 If "Sent: 0" — tap "Check Registered Devices" first. If count is 0, users haven't opened the app yet.\n\n💡 If all deliveries fail, tap "Reset All Tokens" then ask all users to re-open the RHM app.`}
                </Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    tabContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    tab: {
        width: '33.333%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    tabActive: {
        backgroundColor: '#6200ee',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6200ee',
    },
    tabTextActive: {
        color: '#fff',
    },
    tabContent: {
        flex: 1,
        padding: 16,
    },
    analyticsHeader: {
        alignItems: 'center',
        marginVertical: 20,
    },
    analyticsScrollContent: {
        paddingBottom: 140,
    },
    analyticsTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginTop: 10,
    },
    analyticsSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 6,
        textAlign: 'center',
    },
    analyticsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        width: '48%',
        minHeight: 150,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e6e0f2',
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f1e8ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    metricValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#6200ee',
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginTop: 4,
    },
    metricHelper: {
        fontSize: 12,
        color: '#777',
        marginTop: 4,
    },
    analyticsErrorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ffebee',
        borderWidth: 1,
        borderColor: '#ffcdd2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    analyticsErrorText: {
        flex: 1,
        color: '#b71c1c',
        fontSize: 13,
        lineHeight: 18,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        marginBottom: 12,
        minHeight: 100,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#6200ee',
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: '#6200ee',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6200ee',
    },
    typeButtonTextActive: {
        color: '#fff',
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#6200ee',
        borderStyle: 'dashed',
        backgroundColor: '#f9f9f9',
        marginBottom: 12,
        gap: 8,
    },
    mediaButtonText: {
        fontSize: 16,
        color: '#6200ee',
        fontWeight: '600',
    },
    mediaPreview: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    videoPreview: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    videoPreviewText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
    coverPreview: {
        width: 120,
        height: 120,
        borderRadius: 8,
        marginBottom: 12,
    },
    fileSelected: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
        marginBottom: 12,
    },
    fileSelectedText: {
        fontSize: 14,
        color: '#2e7d32',
        fontWeight: '600',
    },
    addOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        marginBottom: 12,
    },
    addOptionText: {
        fontSize: 14,
        color: '#6200ee',
        fontWeight: '600',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6200ee',
        padding: 16,
        borderRadius: 8,
        marginTop: 24,
        marginBottom: 32,
        gap: 8,
    },
    uploadButtonDisabled: {
        opacity: 0.6,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    manageCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    manageDate: {
        fontSize: 12,
        color: '#6200ee',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    manageTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    manageSubtext: {
        fontSize: 13,
        color: '#888',
    },
    manageDeleteBtn: {
        backgroundColor: '#e53935',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    pushHeader: {
        alignItems: 'center',
        marginVertical: 24,
        paddingHorizontal: 20,
    },
    pushTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginTop: 12,
    },
    pushSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
        marginTop: 20,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    screenSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    smallTypeBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#6200ee',
        alignItems: 'center',
    },
    smallTypeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6200ee',
    },
    // ── Push Alerts tab extras ────────────────────────────────────────────────
    resultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: '#a5d6a7',
    },
    resultText: {
        flex: 1,
        fontSize: 13,
        color: '#2e7d32',
        fontWeight: '600',
    },
    charCount: {
        fontSize: 11,
        color: '#aaa',
        textAlign: 'right',
        marginBottom: 8,
        marginTop: -8,
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 20,
    },
    purgeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#e53935',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    purgeButtonText: {
        color: '#e53935',
        fontSize: 14,
        fontWeight: '700',
    },
    reregisterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#1b5e20',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        backgroundColor: '#f1f8e9',
        marginBottom: 12,
    },
    reregisterButtonText: {
        color: '#1b5e20',
        fontSize: 14,
        fontWeight: '700',
    },
    debugButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#1565c0',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        backgroundColor: '#e3f2fd',
        marginBottom: 12,
    },
    debugButtonText: {
        color: '#1565c0',
        fontSize: 14,
        fontWeight: '700',
    },
    // ── Analytics info box (zero hint) ─────────────────────────────────────
    analyticsInfoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: '#90caf9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    analyticsInfoText: {
        flex: 1,
        color: '#1565c0',
        fontSize: 13,
        lineHeight: 18,
    },
    // ── YouTube Sync section ────────────────────────────────────────────────
    ytSyncHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 6,
    },
    ytSyncTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    ytSyncSubtitle: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 14,
    },
    ytSyncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#CC0000',
        padding: 14,
        borderRadius: 8,
        marginTop: 4,
        marginBottom: 32,
        gap: 8,
    },
    ytSyncButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    syncSuccessBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#e8f5e9',
        borderWidth: 1,
        borderColor: '#a5d6a7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    syncSuccessText: {
        flex: 1,
        color: '#2e7d32',
        fontSize: 13,
        fontWeight: '600',
    },
});
