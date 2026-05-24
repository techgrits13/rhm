import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { musicService, MusicTrack } from '../services/musicService';
import MusicAdBanner from '../components/MusicAdBanner';
import ScreenErrorBoundary from '../components/ScreenErrorBoundary';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Initialize Supabase for Realtime
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

type SortOption = 'az' | 'most_played' | 'favorites';

const ITEMS_PER_PAGE = 20;

function MusicListContent() {
    const navigation = useNavigation<any>();
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('az');
    const [favorites, setFavorites] = useState<number[]>([]);
    const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const channelRef = useRef<any>(null);

    // Initial Data Load
    const loadInitialData = async () => {
        try {
            setLoading(true);
            setOffset(0);

            const [musicData, favs, counts] = await Promise.all([
                musicService.getMusicPaginated({ limit: ITEMS_PER_PAGE, offset: 0, sort: 'az' }),
                musicService.getFavorites(),
                musicService.getPlayCounts()
            ]);

            setTracks(musicData.data || []);
            setHasMore(musicData.hasMore);
            setFavorites(favs || []);
            setPlayCounts(counts || {});
            setOffset(ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            setTracks([]);
        } finally {
            setLoading(false);
        }
    };

    // Realtime Subscription
    useEffect(() => {
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
            .channel('music_changes')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'music' },
                (payload: any) => {
                    console.log('🎵 New music track!', payload);
                    // Add new track to top of list
                    setTracks(prev => [payload.new as MusicTrack, ...prev]);
                }
            )
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'music' },
                (payload: any) => {
                    console.log('🗑️ Music track deleted', payload);
                    setTracks(prev => prev.filter(item => item.id !== payload.old.id));
                }
            )
            .subscribe();

        channelRef.current = channel;
    };

    const loadMore = async () => {
        if (loadingMore || !hasMore || searchText) return;

        try {
            setLoadingMore(true);
            const musicData = await musicService.getMusicPaginated({
                limit: ITEMS_PER_PAGE,
                offset,
                sort: 'az'
            });

            setTracks(prev => [...prev, ...(musicData.data || [])]);
            setHasMore(musicData.hasMore);
            setOffset(prev => prev + ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Failed to load more:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadInitialData();
        }, [])
    );

    const getSortedTracks = useCallback(() => {
        let filtered = [...tracks];

        // Filter by search
        if (searchText) {
            const lower = searchText.toLowerCase();
            filtered = filtered.filter(t =>
                t.title?.toLowerCase().includes(lower) ||
                t.artist?.toLowerCase().includes(lower)
            );
        }

        // Sort
        return filtered.sort((a, b) => {
            if (sortBy === 'favorites') {
                const aFav = favorites.includes(a.id) ? 1 : 0;
                const bFav = favorites.includes(b.id) ? 1 : 0;
                if (aFav !== bFav) return bFav - aFav;
                return (a.title || '').localeCompare(b.title || '');
            }
            if (sortBy === 'most_played') {
                const aCount = playCounts[a.id] || 0;
                const bCount = playCounts[b.id] || 0;
                if (aCount !== bCount) return bCount - aCount;
                return (a.title || '').localeCompare(b.title || '');
            }
            // Default A-Z
            return (a.title || '').localeCompare(b.title || '');
        });
    }, [tracks, searchText, sortBy, favorites, playCounts]);

    const renderItem = useCallback(({ item }: { item: MusicTrack }) => {
        if (!item || !item.id) return null;

        const isFav = favorites.includes(item.id);
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('MusicPlayer', { trackId: item.id, playlist: getSortedTracks() })}
                activeOpacity={0.7}
            >
                <Image
                    source={item.cover_url ? { uri: item.cover_url } : require('../assets/icon.png')}
                    style={styles.cover}
                />
                <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>{item.title || 'Unknown Title'}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{item.artist || 'Unknown Artist'}</Text>
                </View>
                <View style={styles.actions}>
                    {isFav && <Ionicons name="heart" size={16} color="red" style={{ marginRight: 8 }} />}
                    <Ionicons name="play-circle-outline" size={28} color="#6200ee" />
                </View>
            </TouchableOpacity>
        );
    }, [favorites, navigation, getSortedTracks]);

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#6200ee" />
                <Text style={styles.footerText}>Loading more songs...</Text>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No music found</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Search & Filter Header */}
            <View style={styles.header}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        style={styles.input}
                        placeholder="Search songs..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <View style={styles.filters}>
                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'az' && styles.filterBtnActive]}
                        onPress={() => setSortBy('az')}
                    >
                        <Text style={[styles.filterText, sortBy === 'az' && styles.filterTextActive]}>A-Z</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'favorites' && styles.filterBtnActive]}
                        onPress={() => setSortBy('favorites')}
                    >
                        <Text style={[styles.filterText, sortBy === 'favorites' && styles.filterTextActive]}>Favorites</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, sortBy === 'most_played' && styles.filterBtnActive]}
                        onPress={() => setSortBy('most_played')}
                    >
                        <Text style={[styles.filterText, sortBy === 'most_played' && styles.filterTextActive]}>Top Played</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6200ee" />
                </View>
            ) : (
                <FlatList
                    style={{ flex: 1 }}
                    data={getSortedTracks()}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    // Hardening: Performance optimization
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={15}
                    updateCellsBatchingPeriod={50}
                    getItemLayout={(data, index) => (
                        // Height 70 + Margin 10 = 80 approx
                        { length: 80, offset: 80 * index, index }
                    )}
                />
            )}
            <MusicAdBanner />
        </View>
    );
}

export default function MusicListScreen() {
    return (
        <ScreenErrorBoundary>
            <MusicListContent />
        </ScreenErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f1f1',
        padding: 8,
        borderRadius: 8,
        marginBottom: 12
    },
    input: { flex: 1, marginLeft: 8, fontSize: 16 },
    filters: { flexDirection: 'row', justifyContent: 'space-between' },
    filterBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#eee'
    },
    filterBtnActive: { backgroundColor: '#6200ee' },
    filterText: { fontSize: 13, color: '#333' },
    filterTextActive: { color: '#fff', fontWeight: 'bold' },
    list: { padding: 16 },
    // New styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        color: '#666',
        fontSize: 12,
        marginTop: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        color: '#666',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        marginBottom: 10,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
    },
    cover: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#eee' },
    info: { flex: 1, marginLeft: 12 },
    title: { fontSize: 16, fontWeight: '600', color: '#222' },
    artist: { fontSize: 14, color: '#666', marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center' },
    empty: { textAlign: 'center', marginTop: 40, color: '#666' }
});
