import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetJson } from '../utils/safeStorage';

const RECORDINGS_DIR = `${FileSystem.documentDirectory!}RHM_Recordings/`;
const RECORDINGS_INDEX_KEY = '@recordings_index';

export interface Recording {
  id: string;
  filename: string;
  uri: string;
  duration: number; // in seconds
  size: number; // in bytes
  createdAt: string;
  title?: string;
}

class RecordingService {
  private recording: Audio.Recording | null = null;
  private recordingStartTime: number = 0;

  /**
   * Initialize recordings directory
   */
  async initialize(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      await this.initialize();

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        // Reset audio mode before throwing to prevent bad state
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        throw new Error('Recording permission not granted');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 64000, // 64kbps - good quality, reasonable file size
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });

      await recording.startAsync();
      this.recording = recording;
      this.recordingStartTime = Date.now();
    } catch (error) {
      console.error('Failed to start recording:', error);
      await this.reset();
      throw error;
    }
  }

  /**
   * Stop recording and save to file
   */
  async stopRecording(): Promise<Recording> {
    if (!this.recording) {
      throw new Error('No active recording');
    }

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Calculate duration
      const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `recording_${timestamp}.m4a`;
      const newUri = `${RECORDINGS_DIR}${filename}`;

      // Move recording to recordings directory
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(newUri);
      const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

      // Create recording metadata
      const recording: Recording = {
        id: timestamp,
        filename,
        uri: newUri,
        duration,
        size,
        createdAt: new Date().toISOString(),
      };

      // Save to index
      await this.saveRecordingToIndex(recording);

      this.recording = null;
      return recording;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      await this.reset();
      throw error;
    }
  }

  /**
   * Reset recording state
   */
  private async reset(): Promise<void> {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    this.recording = null;
    this.recordingStartTime = 0;
  }

  /**
   * Get current recording duration
   */
  getRecordingDuration(): number {
    if (!this.recording || this.recordingStartTime === 0) {
      return 0;
    }
    return Math.floor((Date.now() - this.recordingStartTime) / 1000);
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recording !== null;
  }

  /**
   * Get all recordings
   */
  async getAllRecordings(): Promise<Recording[]> {
    try {
      const recordings = await safeGetJson<Recording[]>(RECORDINGS_INDEX_KEY, []);

      // Verify files still exist
      const validRecordings: Recording[] = [];
      for (const rec of recordings) {
        const fileInfo = await FileSystem.getInfoAsync(rec.uri);
        if (fileInfo.exists) {
          validRecordings.push(rec);
        }
      }

      // Update index if some files were deleted
      if (validRecordings.length !== recordings.length) {
        await AsyncStorage.setItem(RECORDINGS_INDEX_KEY, JSON.stringify(validRecordings));
      }

      return validRecordings.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get recordings:', error);
      return [];
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(id: string): Promise<void> {
    try {
      const recordings = await this.getAllRecordings();
      const recording = recordings.find(r => r.id === id);

      if (!recording) {
        throw new Error('Recording not found');
      }

      // Delete file
      await FileSystem.deleteAsync(recording.uri, { idempotent: true });

      // Update index
      const updatedRecordings = recordings.filter(r => r.id !== id);
      await AsyncStorage.setItem(RECORDINGS_INDEX_KEY, JSON.stringify(updatedRecordings));
    } catch (error) {
      console.error('Failed to delete recording:', error);
      throw error;
    }
  }

  /**
   * Update recording title
   */
  async updateRecordingTitle(id: string, title: string): Promise<void> {
    try {
      const recordings = await this.getAllRecordings();
      const recording = recordings.find(r => r.id === id);

      if (!recording) {
        throw new Error('Recording not found');
      }

      recording.title = title;
      await AsyncStorage.setItem(RECORDINGS_INDEX_KEY, JSON.stringify(recordings));
    } catch (error) {
      console.error('Failed to update recording title:', error);
      throw error;
    }
  }

  /**
   * Get total storage used by recordings
   */
  async getTotalStorageUsed(): Promise<number> {
    const recordings = await this.getAllRecordings();
    return recordings.reduce((total, rec) => total + rec.size, 0);
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format duration to MM:SS
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Save recording to index
   */
  private async saveRecordingToIndex(recording: Recording): Promise<void> {
    const recordings = await this.getAllRecordings();
    recordings.push(recording);
    await AsyncStorage.setItem(RECORDINGS_INDEX_KEY, JSON.stringify(recordings));
  }
}

export const recordingService = new RecordingService();
