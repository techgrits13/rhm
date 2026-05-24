import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Share,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { musicService, MusicTrack } from '../services/musicService';
import { useAudio } from '../context/AudioContext';
import NativeAdCard from '../components/NativeAdCard';

type RootStackParamList = {
    MusicPlayer: { trackId: number; playlist: MusicTrack[] };
};

const { width } = Dimensions.get('window');

export default function MusicPlayerScreen() {
    const route = useRoute<RouteProp<RootStackParamList, 'MusicPlayer'>>();
    const navigation = useNavigation<any>();
    const { trackId, playlist: rawPlaylist = [] } = route.params || {};

    const {
        isPlaying,
        isLoading: isAudioLoading,
        currentTrack,
        position,
        duration,
        playMusic,
        pause: pauseAudio,
        seek: seekAudio,
    } = useAudio();

    const [isFavorite, setIsFavorite] = useState(false);
    const [isLocalLoading, setIsLocalLoading] = useState(true);
    const [isShuffled, setIsShuffled] = useState(false);
    const [playlist, setPlaylist] = useState<MusicTrack[]>(rawPlaylist);
    const [inPlaylist, setInPlaylist] = useState(false);

    // Load track on mount / trackId change
    useEffect(() => {
        if (playlist.length > 0 && trackId) {
            const track = playlist.find((t: MusicTrack) => t.id === trackId);
            if (track) loadTrack(track);
        }
    }, [trackId]);

    // Check if current track is already in user playlist
    useEffect(() => {
        if (currentTrack) {
            musicService.isInPlaylist(currentTrack.id).then(setInPlaylist);
        }
    }, [currentTrack]);

    const loadTrack = async (track: MusicTrack) => {
        try {
            setIsLocalLoading(true);
            const favs = await musicService.getFavorites();
            setIsFavorite(favs.includes(track.id));
            musicService.incrementPlayCount(track.id);
            await playMusic(track);
            setIsLocalLoading(false);
        } catch (error) {
            console.error('Error loading sound', error);
            setIsLocalLoading(false);
        }
    };

    const getNextIndex = useCallback(() => {
        if (!currentTrack || !playlist.length) return 0;
        const idx = playlist.findIndex((t) => t.id === currentTrack.id);
        if (isShuffled) {
            let next = Math.floor(Math.random() * playlist.length);
            while (next === idx && playlist.length > 1) {
                next = Math.floor(Math.random() * playlist.length);
            }
            return next;
        }
        return (idx + 1) % playlist.length;
    }, [currentTrack, playlist, isShuffled]);

    const getPrevIndex = useCallback(() => {
        if (!currentTrack || !playlist.length) return 0;
        const idx = playlist.findIndex((t) => t.id === currentTrack.id);
        if (isShuffled) {
            let prev = Math.floor(Math.random() * playlist.length);
            while (prev === idx && playlist.length > 1) {
                prev = Math.floor(Math.random() * playlist.length);
            }
            return prev;
        }
        return (idx - 1 + playlist.length) % playlist.length;
    }, [currentTrack, playlist, isShuffled]);

    const playNext = () => {
        const next = playlist[getNextIndex()];
        if (next) navigation.setParams({ trackId: next.id });
    };

    const playPrev = () => {
        const prev = playlist[getPrevIndex()];
        if (prev) navigation.setParams({ trackId: prev.id });
    };

    const togglePlay = async () => {
        if (isPlaying) {
            await pauseAudio();
        } else if (currentTrack) {
            await playMusic(currentTrack);
        }
    };

    const toggleFav = async () => {
        if (!currentTrack) return;
        const newState = await musicService.toggleFavorite(currentTrack.id);
        setIsFavorite(newState);
    };

    const toggleShuffle = () => {
        setIsShuffled((prev) => !prev);
    };

    const shareTrack = async () => {
        if (!currentTrack) return;
        try {
            await Share.share({
                message: `🎵 Now listening to "${currentTrack.title}" by ${currentTrack.artist} on RHM Church App\n\nGet the app: https://play.google.com/store/apps/details?id=com.rhm.app&pcampaignid=web_share`,
                title: currentTrack.title,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const togglePlaylist = async () => {
        if (!currentTrack) return;
        if (inPlaylist) {
            await musicService.removeFromPlaylist(currentTrack.id);
            setInPlaylist(false);
            Alert.alert('Removed', `"${currentTrack.title}" removed from playlist.`);
        } else {
            await musicService.addToPlaylist(currentTrack);
            setInPlaylist(true);
            Alert.alert('Added!', `"${currentTrack.title}" added to your playlist.`);
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    if (!currentTrack) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            {/* Artwork */}
            <View style={styles.artContainer}>
                <Image
                    source={
                        currentTrack.cover_url
                            ? { uri: currentTrack.cover_url }
                            : require('../assets/icon.png')
                    }
                    style={styles.artwork}
                />
            </View>

            {/* Info row */}
            <View style={styles.infoContainer}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
                </View>
                <TouchableOpacity onPress={toggleFav} style={styles.iconBtn}>
                    <Ionicons
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        size={28}
                        color={isFavorite ? '#e74c3c' : '#333'}
                    />
                </TouchableOpacity>
            </View>

            {/* Progress Slider */}
            <View style={styles.sliderContainer}>
                <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={0}
                    maximumValue={duration}
                    value={position}
                    onSlidingComplete={seekAudio}
                    minimumTrackTintColor="#6200ee"
                    maximumTrackTintColor="#ccc"
                    thumbTintColor="#6200ee"
                />
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
            </View>

            {/* Main Controls */}
            <View style={styles.controls}>
                {/* Shuffle */}
                <TouchableOpacity onPress={toggleShuffle} style={styles.iconBtn}>
                    <Ionicons
                        name="shuffle"
                        size={26}
                        color={isShuffled ? '#6200ee' : '#aaa'}
                    />
                </TouchableOpacity>

                {/* Prev */}
                <TouchableOpacity onPress={playPrev} style={styles.iconBtn}>
                    <Ionicons name="play-skip-back" size={34} color="#333" />
                </TouchableOpacity>

                {/* Play / Pause */}
                <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
                    {isAudioLoading || isLocalLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={38} color="#fff" />
                    )}
                </TouchableOpacity>

                {/* Next */}
                <TouchableOpacity onPress={playNext} style={styles.iconBtn}>
                    <Ionicons name="play-skip-forward" size={34} color="#333" />
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity onPress={shareTrack} style={styles.iconBtn}>
                    <Ionicons name="share-social-outline" size={26} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Secondary Actions */}
            <View style={styles.secondaryControls}>
                <TouchableOpacity onPress={togglePlaylist} style={styles.playlistBtn}>
                    <Ionicons
                        name={inPlaylist ? 'list' : 'list-outline'}
                        size={20}
                        color={inPlaylist ? '#6200ee' : '#555'}
                    />
                    <Text style={[styles.playlistBtnText, inPlaylist && { color: '#6200ee' }]}>
                        {inPlaylist ? 'In Playlist' : 'Add to Playlist'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Native Ad shown while playing */}
            {isPlaying && (
                <View style={styles.adWrapper}>
                    <NativeAdCard />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#fff' },
    container: {
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 40,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    artContainer: {
        width: width * 0.78,
        height: width * 0.78,
        borderRadius: 20,
        elevation: 10,
        shadowColor: '#6200ee',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        marginBottom: 28,
    },
    artwork: { width: '100%', height: '100%', borderRadius: 20, backgroundColor: '#eee' },
    infoContainer: {
        width: '88%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 21, fontWeight: '800', color: '#1a1a1a' },
    artist: { fontSize: 15, color: '#777', marginTop: 3 },
    sliderContainer: { width: '88%', marginBottom: 16 },
    timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
    timeText: { fontSize: 12, color: '#aaa' },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '88%',
        marginBottom: 20,
    },
    iconBtn: { padding: 8 },
    playButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#6200ee',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#6200ee',
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    secondaryControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    playlistBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        backgroundColor: '#f0ebff',
    },
    playlistBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    adWrapper: {
        width: '100%',
        marginTop: 8,
    },
});
