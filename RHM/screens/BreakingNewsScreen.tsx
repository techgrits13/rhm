import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    Dimensions,
    Alert,
    ActivityIndicator,
    Linking,
    Modal,
    StatusBar,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Text as SvgText, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import api, { supabaseApi } from '../services/api';
import AdBanner from '../components/AdBanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

const { width, height } = Dimensions.get('window');

interface NewsItem {
    id: number;
    type: 'text' | 'image' | 'video' | 'poll' | 'link';
    content: string;
    media_url?: string;
    link_url?: string;
    poll_options?: { id: number; text: string; votes: number }[];
    created_at: string;
    user_reaction?: string;
    reaction_counts?: { [emoji: string]: number };
}

const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    if (isNaN(past.getTime())) return 'Recently';
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    try { return past.toLocaleDateString(); } catch { return 'Recently'; }
};

// ─── Full-Screen Image Modal ─────────────────────────────────────────────────
function FullScreenImageModal({
    visible,
    imageUrl,
    onClose,
}: {
    visible: boolean;
    imageUrl: string;
    onClose: () => void;
}) {
    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <StatusBar backgroundColor="#000" barStyle="light-content" />
            <View style={fsStyles.container}>
                {/* Close button */}
                <SafeAreaView style={fsStyles.topBar}>
                    <TouchableOpacity onPress={onClose} style={fsStyles.closeBtn} activeOpacity={0.8}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Full-screen image */}
                <Image
                    source={{ uri: imageUrl }}
                    style={fsStyles.image}
                    resizeMode="contain"
                />

                {/* Bottom hint */}
                <View style={fsStyles.bottomHint}>
                    <Text style={fsStyles.hintText}>Tap × to close</Text>
                </View>
            </View>
        </Modal>
    );
}

const fsStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        paddingTop: 40,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width,
        height,
    },
    bottomHint: {
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
    },
    hintText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
    },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function BreakingNewsScreen() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const channelRef = useRef<any>(null);

    // Full-screen image state
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    useEffect(() => {
        loadUserId();
        fetchNews(1);
        subscribeToRealtime();
        return () => {
            if (channelRef.current && supabase) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, []);

    const subscribeToRealtime = () => {
        if (!supabase) return;
        const channel = supabase
            .channel('breaking_news_changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'breaking_news' },
                (payload: any) => setNews(prev => [payload.new as NewsItem, ...prev])
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'breaking_news' },
                (payload: any) => setNews(prev => prev.filter(item => item.id !== payload.old.id))
            )
            .subscribe();
        channelRef.current = channel;
    };

    const loadUserId = async () => {
        let id = await AsyncStorage.getItem('user_identifier');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substr(2, 9);
            await AsyncStorage.setItem('user_identifier', id);
        }
        setUserId(id || 'anon');
    };

    const fetchNews = async (pageNum: number) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const response = await supabaseApi.get('/breaking-news', {
                params: { page: pageNum, limit: 20 }
            });

            if (!response || !response.data) {
                if (pageNum === 1) setNews([]);
                setHasMore(false);
                return;
            }

            const rawItems = Array.isArray((response.data as any)?.data)
                ? (response.data as any).data
                : Array.isArray(response.data)
                    ? response.data
                    : [];

            const newItems: NewsItem[] = rawItems
                .filter((item: any) => item && typeof item.id === 'number' && typeof item.type === 'string')
                .map((item: any) => item as NewsItem);

            if (pageNum === 1) {
                setNews(newItems);
            } else {
                setNews(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    return [...prev, ...newItems.filter(i => !existingIds.has(i.id))];
                });
            }

            setHasMore(newItems.length === 20);
            setPage(pageNum);
        } catch (error) {
            console.error('Error fetching news:', error);
            if (pageNum === 1) setNews([]);
            setHasMore(false);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => { setRefreshing(true); fetchNews(1); };
    const loadMore = () => {
        if (!loading && !loadingMore && hasMore) fetchNews(page + 1);
    };

    const handleReaction = async (item: NewsItem, reaction: string) => {
        if (!item?.id || !reaction || !userId) return;

        const prevReaction = item.user_reaction;
        const prevCounts = item.reaction_counts || {};
        const updatedCounts = { ...prevCounts };

        if (prevReaction && prevReaction !== reaction) {
            updatedCounts[prevReaction] = Math.max(0, (updatedCounts[prevReaction] || 1) - 1);
            if (updatedCounts[prevReaction] === 0) delete updatedCounts[prevReaction];
        }
        if (prevReaction !== reaction) {
            updatedCounts[reaction] = (updatedCounts[reaction] || 0) + 1;
        }

        setNews(prev => prev.map(n =>
            n?.id === item.id ? { ...n, user_reaction: reaction, reaction_counts: updatedCounts } : n
        ));

        try {
            const res = await supabaseApi.post('/breaking-news/react', {
                post_id: item.id,
                user_id: userId,
                emoji: reaction
            });
            if (res?.data?.reaction_counts) {
                setNews(prev => prev.map(n =>
                    n?.id === item.id ? { ...n, reaction_counts: res.data.reaction_counts } : n
                ));
            }
        } catch (e) {
            console.error('Reaction failed:', e);
        }
    };

    const handleVote = async (item: NewsItem, optionIndex: number) => {
        try {
            const res = await api.post(`/breaking-news/${item.id}/vote`, { option_index: optionIndex });
            setNews(prev => prev.map(n => n.id === item.id ? { ...n, poll_options: res.data.poll_options } : n));
        } catch {
            Alert.alert('Vote Failed', 'Could not register your vote.');
        }
    };

    const renderItem = ({ item }: { item: NewsItem }) => {
        if (!item?.id) return null;

        const isImage = item.type === 'image';
        const isVideo = item.type === 'video';
        const isPoll = item.type === 'poll';
        const isLink = item.type === 'link';

        const openLink = async (url: string) => {
            try {
                await WebBrowser.openBrowserAsync(url);
            } catch {
                Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open this link.'));
            }
        };

        return (
            <View style={styles.card}>
                {/* Card header */}
                <View style={styles.header}>
                    <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.avatar}>
                        <Ionicons name="megaphone" size={16} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.author}>Admin Announcement</Text>
                        <Text style={styles.date}>{getRelativeTime(item.created_at)}</Text>
                    </View>
                </View>

                {/* Text content */}
                {item.content ? (
                    <Text style={styles.content}>{item.content}</Text>
                ) : null}

                {/* ── Tappable Image → Full Screen ── */}
                {isImage && item.media_url && (
                    <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={() => setFullScreenImage(item.media_url!)}
                        style={styles.imageTouchable}
                    >
                        <Image
                            source={{ uri: item.media_url }}
                            style={styles.media}
                            resizeMode="cover"
                            onError={(e) => console.warn('Image load error:', e.nativeEvent.error)}
                        />
                        {/* "Tap to expand" overlay hint */}
                        <View style={styles.expandHint}>
                            <Ionicons name="expand-outline" size={18} color="#fff" />
                            <Text style={styles.expandHintText}>Tap to expand</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Video */}
                {isVideo && item.media_url && (
                    <Video
                        style={styles.media}
                        source={{ uri: item.media_url }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                        onError={(e) => console.warn('Video load error:', e)}
                    />
                )}

                {/* Link card */}
                {isLink && item.link_url && (
                    <TouchableOpacity
                        style={styles.linkCard}
                        onPress={() => openLink(item.link_url!)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="globe-outline" size={28} color="#1976D2" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.linkUrl} numberOfLines={1}>{item.link_url}</Text>
                            <Text style={styles.linkTapHint}>Tap to open</Text>
                        </View>
                        <Ionicons name="open-outline" size={20} color="#1976D2" />
                    </TouchableOpacity>
                )}

                {/* Poll */}
                {isPoll && Array.isArray(item.poll_options) && item.poll_options.length > 0 && (
                    <View style={styles.pollContainer}>
                        {item.poll_options.map((opt, idx) => {
                            if (!opt || typeof opt.text !== 'string') return null;
                            const totalVotes = item.poll_options!.reduce((acc, curr) => acc + (curr?.votes || 0), 0);
                            const percentage = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
                            return (
                                <TouchableOpacity key={idx} style={styles.pollOption} onPress={() => handleVote(item, idx)}>
                                    <LinearGradient
                                        colors={['#42A5F5', '#1E88E5']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.pollProgress, { width: `${percentage}%` as any }]}
                                    />
                                    <Text style={styles.pollText}>{opt.text}</Text>
                                    <Text style={styles.pollVotes}>{opt.votes || 0} ({percentage.toFixed(0)}%)</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Reactions */}
                <View style={styles.footer}>
                    <View style={styles.reactions}>
                        {['👍', '❤️', '🙏', '🔥'].map(emoji => {
                            const count = item.reaction_counts?.[emoji] || 0;
                            const isActive = item.user_reaction === emoji;
                            return (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => handleReaction(item, emoji)}
                                    style={[styles.reactionBtn, isActive && styles.reactionActive]}
                                >
                                    <Text style={styles.emoji}>{emoji}</Text>
                                    {count > 0 && (
                                        <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
                                            {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#1976D2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Full-screen image modal */}
            {fullScreenImage && (
                <FullScreenImageModal
                    visible={!!fullScreenImage}
                    imageUrl={fullScreenImage}
                    onClose={() => setFullScreenImage(null)}
                />
            )}

            {/* Gradient header */}
            <LinearGradient
                colors={['#1976D2', '#2196F3', '#64B5F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.straightTextContainer}>
                    <Svg height="60" width={width}>
                        <Defs>
                            <SvgLinearGradient id="rainbow" x1="0" y1="0" x2="100%" y2="0">
                                <Stop offset="0%" stopColor="#FFD700" />
                                <Stop offset="20%" stopColor="#FFA500" />
                                <Stop offset="40%" stopColor="#FF69B4" />
                                <Stop offset="60%" stopColor="#00CED1" />
                                <Stop offset="80%" stopColor="#9370DB" />
                                <Stop offset="100%" stopColor="#FFD700" />
                            </SvgLinearGradient>
                        </Defs>
                        <SvgText
                            fill="url(#rainbow)"
                            fontSize="32"
                            fontWeight="bold"
                            letterSpacing="3"
                            x={width / 2}
                            y="40"
                            textAnchor="middle"
                        >
                            PREPARE THE WAY
                        </SvgText>
                    </Svg>
                </View>
            </LinearGradient>

            <FlatList
                style={{ flex: 1 }}
                data={news}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976D2']} />}
                contentContainerStyle={styles.list}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="newspaper-outline" size={64} color="#90CAF9" />
                        <Text style={styles.emptyText}>No announcements yet</Text>
                        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
                    </View>
                }
                ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 20 }} color="#1976D2" /> : null}
                removeClippedSubviews={true}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                updateCellsBatchingPeriod={50}
            />

            <View style={styles.adContainer}>
                <AdBanner />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    headerGradient: {
        paddingTop: 10,
        paddingBottom: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    straightTextContainer: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adContainer: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        alignItems: 'center',
        paddingVertical: 8,
        marginTop: 10,
        marginBottom: 32,
        minHeight: 70,
    },
    list: { padding: 10, paddingBottom: 20 },
    card: {
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        borderLeftWidth: 4,
        borderLeftColor: '#1976D2',
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    avatar: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginRight: 10
    },
    author: { fontWeight: 'bold', fontSize: 15, color: '#1565C0' },
    date: { fontSize: 12, color: '#666', marginTop: 2 },
    content: { fontSize: 15, marginBottom: 8, lineHeight: 22, fontWeight: '500', color: '#1565C0' },
    // ── Tappable image ──
    imageTouchable: {
        position: 'relative',
        marginBottom: 8,
        borderRadius: 10,
        overflow: 'hidden',
    },
    media: {
        width: '100%',
        height: 250,
        backgroundColor: '#000',
    },
    expandHint: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        gap: 4,
    },
    expandHintText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // ── Poll ──
    pollContainer: { marginTop: 8 },
    pollOption: {
        borderWidth: 1.5, borderColor: '#BBDEFB', borderRadius: 8,
        padding: 12, marginBottom: 8, position: 'relative', overflow: 'hidden',
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff'
    },
    pollProgress: {
        position: 'absolute', top: 0, bottom: 0, left: 0, opacity: 0.2
    },
    pollText: { fontWeight: '600', fontSize: 14, color: '#1565C0', zIndex: 1 },
    pollVotes: { fontSize: 12, color: '#666', fontWeight: '600', zIndex: 1 },
    // ── Reactions ──
    footer: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 8, marginTop: 6 },
    reactions: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    reactionBtn: { padding: 6, borderRadius: 20, alignItems: 'center', flexDirection: 'row', gap: 4 },
    reactionActive: { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
    emoji: { fontSize: 22 },
    reactionCount: { fontSize: 12, color: '#555', fontWeight: '600', minWidth: 14 },
    reactionCountActive: { color: '#1565C0' },
    // ── Link ──
    linkCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#BBDEFB', borderRadius: 10,
        padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#90CAF9',
    },
    linkUrl: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
    linkTapHint: { fontSize: 11, color: '#1976D2', marginTop: 2 },
    // ── Empty state ──
    emptyContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingTop: 80, paddingBottom: 40,
    },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#1976D2', marginTop: 16 },
    emptySubtext: { fontSize: 14, color: '#888', marginTop: 6 },
});
