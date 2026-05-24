import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { videoService, Video } from '../services/videoService';
import YoutubePlayer from 'react-native-youtube-iframe';
import AdBanner from '../components/AdBanner';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  // Add Hamburger Menu to Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchVideos = async (forceSync = false) => {
    try {
      setLoading(true);
      const response = await videoService.getAllVideos();
      
      // If no videos found and not already forced, try to sync from YouTube
      if ((!response.videos || response.videos.length === 0) && !forceSync) {
        console.log('💡 No videos found in database. Triggering automatic sync from YouTube...');
        await videoService.syncVideos();
        // Fetch again after sync
        const nextResponse = await videoService.getAllVideos();
        setVideos(nextResponse.videos || []);
      } else {
        setVideos(response.videos || []);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Trigger a sync in the background so it doesn't block the UI
    videoService.syncVideos().catch(err => console.error('Background sync failed:', err));
    await fetchVideos(true); // forceSync true to refresh from DB
    setRefreshing(false);
  };

  const openVideo = async (videoId: string) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
      const supported = await Linking.canOpenURL(youtubeUrl);
      if (supported) {
        await Linking.openURL(youtubeUrl);
      }
    } catch (error) {
      console.error('Failed to open video:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderVideoCard = ({ item }: { item: Video }) => (
    <View style={styles.card}>
      {playingVideoId === item.video_id ? (
        <View style={styles.webviewContainer}>
          <YoutubePlayer
            height={220}
            play={true}
            videoId={item.video_id}
            onError={() => {
              // Fallback: open in YouTube app if embed fails (e.g., error 153)
              setPlayingVideoId(null);
              openVideo(item.video_id);
            }}
          />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setPlayingVideoId(item.video_id)}
        >
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.videoDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.videoDate}>{formatDate(item.published_at)}</Text>
        <View style={styles.inlineActions}>
          {playingVideoId === item.video_id ? (
            <TouchableOpacity onPress={() => setPlayingVideoId(null)}>
              <Text style={styles.actionLink}>Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setPlayingVideoId(item.video_id)}>
              <Text style={styles.actionLink}>Play inline</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => openVideo(item.video_id)}>
            <Text style={styles.actionLink}>Open in YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No videos available yet</Text>
      <Text style={styles.emptySubtext}>
        Check back soon for new content from our church!
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={loading ? null : renderEmpty}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      )}

      <View style={styles.adContainer}>
        <AdBanner />
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('BreakingNews');
                }}
              >
                <Ionicons name="newspaper" size={24} color="#6200ee" />
                <Text style={styles.menuText}>Breaking News</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('MusicList');
                }}
              >
                <Ionicons name="musical-notes" size={24} color="#6200ee" />
                <View>
                  <Text style={styles.menuText}>Worship Songs 🎵</Text>
                  <Text style={styles.menuSubtext}>Listen to latest uploads</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 12,
  },
  adContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
    paddingVertical: 8,
    minHeight: 70,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  webviewContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  cardContent: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  videoDate: {
    fontSize: 12,
    color: '#999',
  },
  inlineActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  actionLink: {
    color: '#6200ee',
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 50, // Below header
    paddingRight: 10,
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    width: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  menuSubtext: {
    fontSize: 12,
    color: '#888',
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 8,
  },
});

