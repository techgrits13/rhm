import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { radioService } from '../services/radioService';
import { recordingService } from '../services/recordingService';
import { useTheme } from '../context/ThemeContext';
import { useAudio } from '../context/AudioContext';
import NativeAdCard from '../components/NativeAdCard';

export default function RadioScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const {
    isPlaying,
    isLoading: isAudioLoading,
    playRadio,
    stop: stopAudio
  } = useAudio();

  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [radioUrl, setRadioUrl] = useState('');
  const [stationName, setStationName] = useState('');

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null);

  // Keep screen awake while radio is playing
  useKeepAwake('radio-playback', { suppressDeactivateWarnings: isPlaying });

  useEffect(() => {
    fetchRadioInfo();
    return () => {
      if (recordingTimer) clearInterval(recordingTimer);
    };
  }, []);

  const fetchRadioInfo = async () => {
    try {
      const data = await radioService.getStreamUrl();
      setRadioUrl(data.radioUrl);
      setStationName(data.station);
    } catch (error) {
      console.error('Error fetching radio info:', error);
      setStationName('Radio Stream');
      setRadioUrl('');
      Alert.alert(
        'Connection Error',
        'Could not connect to server. Please check your network connection.',
        [{ text: 'OK' }]
      );
    }
  };

  async function togglePlayback() {
    if (isLoadingInfo || !radioUrl) return;
    if (isPlaying) {
      await stopAudio();
      if (isRecording) await stopRecording();
    } else {
      try {
        await playRadio(radioUrl);
      } catch (error) {
        console.error('Playback error:', error);
        Alert.alert('Error', 'Could not play the radio stream.');
      }
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    if (!isPlaying) {
      Alert.alert('Start Radio First', 'Please start playing the radio before recording.');
      return;
    }
    try {
      await recordingService.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);
      const timer = setInterval(() => {
        setRecordingDuration(recordingService.getRecordingDuration());
      }, 1000);
      setRecordingTimer(timer);
      Alert.alert('Recording Started', 'Your radio recording has started!');
    } catch (error: any) {
      Alert.alert('Recording Error', error.message || 'Failed to start recording');
    }
  }

  async function stopRecording() {
    try {
      if (recordingTimer) {
        clearInterval(recordingTimer);
        setRecordingTimer(null);
      }
      const recording = await recordingService.stopRecording();
      setIsRecording(false);
      setRecordingDuration(0);
      Alert.alert(
        'Recording Saved!',
        `Your recording (${recordingService.formatDuration(recording.duration)}) has been saved.`,
        [
          { text: 'OK' },
          { text: 'View Recordings', onPress: () => (navigation as any).navigate('Recordings') },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save recording');
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    stationName: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      color: colors.text,
      marginBottom: 12,
    },
    playButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 40,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    statusText: {
      fontSize: 16,
      color: colors.secondaryText,
      marginBottom: 20,
    },
    recordingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ff6b6b',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
      gap: 8,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#fff',
    },
    recordingText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
    },
    controlsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    controlButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    recordButton: {
      backgroundColor: '#ff6b6b',
    },
    recordButtonActive: {
      backgroundColor: '#d63031',
    },
    controlButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 14,
    },
    recordButtonText: {
      color: '#fff',
    },
    adWrapper: {
      paddingVertical: 12,
      width: '100%',
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
      marginTop: 'auto', // Pushes the ad to the bottom of the screen
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.stationName}>{stationName || 'Loading...'}</Text>

        <TouchableOpacity style={styles.playButton} onPress={togglePlayback} disabled={!radioUrl}>
          {isAudioLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={60} color="#fff" />
          )}
        </TouchableOpacity>

        <Text style={styles.statusText}>
          {isAudioLoading ? 'Connecting...' : isPlaying ? 'Now Playing' : 'Tap to Play'}
        </Text>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              Recording {recordingService.formatDuration(recordingDuration)}
            </Text>
          </View>
        )}

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, styles.recordButton, isRecording && styles.recordButtonActive]}
            onPress={toggleRecording}
            disabled={!isPlaying && !isRecording}
          >
            <Ionicons name={isRecording ? 'stop-circle' : 'radio-button-on'} size={20} color="#fff" />
            <Text style={[styles.controlButtonText, styles.recordButtonText]}>
              {isRecording ? 'Stop Recording' : 'Record'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => (navigation as any).navigate('Recordings')}
          >
            <Ionicons name="folder-open-outline" size={20} color={colors.text} />
            <Text style={styles.controlButtonText}>My Recordings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Native Ad — replaces the old banner ad */}
      <View style={styles.adWrapper}>
        <NativeAdCard />
      </View>
    </View>
  );
}
