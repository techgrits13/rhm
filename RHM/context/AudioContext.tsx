import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { MusicTrack } from '../services/musicService';

type AudioType = 'radio' | 'music' | null;

interface AudioContextType {
    isPlaying: boolean;
    isLoading: boolean;
    currentAudioType: AudioType;
    currentTrack: MusicTrack | null;
    position: number;
    duration: number;
    playRadio: (url: string) => Promise<void>;
    playMusic: (track: MusicTrack) => Promise<void>;
    pause: () => Promise<void>;
    stop: () => Promise<void>;
    seek: (position: number) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentAudioType, setCurrentAudioType] = useState<AudioType>(null);
    const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    // Initial audio configuration
    useEffect(() => {
        const setupAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (error) {
                console.error('Audio setup error:', error);
            }
        };
        setupAudio();

        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 0);

            if (status.didJustFinish) {
                setIsPlaying(false);
            }
        } else if (status.error) {
            console.error(`Playback error: ${status.error}`);
            setIsPlaying(false);
        }
    }, []);

    const playRadio = async (url: string) => {
        try {
            setIsLoading(true);

            // If already playing radio with same URL, just play
            if (currentAudioType === 'radio' && sound && isPlaying) {
                setIsLoading(false);
                return;
            }

            // Cleanup previous sound
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setCurrentAudioType('radio');
            setCurrentTrack(null);
            setIsPlaying(true);
        } catch (error) {
            console.error('Error playing radio:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const playMusic = async (track: MusicTrack) => {
        try {
            setIsLoading(true);

            // Cleanup previous sound
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: track.audio_url },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setCurrentAudioType('music');
            setCurrentTrack(track);
            setIsPlaying(true);
        } catch (error) {
            console.error('Error playing music:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const pause = async () => {
        if (sound) {
            await sound.pauseAsync();
            setIsPlaying(false);
        }
    };

    const stop = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
            setCurrentAudioType(null);
            setCurrentTrack(null);
            setIsPlaying(false);
        }
    };

    const seek = async (pos: number) => {
        if (sound) {
            await sound.setPositionAsync(pos);
        }
    };

    return (
        <AudioContext.Provider value={{
            isPlaying,
            isLoading,
            currentAudioType,
            currentTrack,
            position,
            duration,
            playRadio,
            playMusic,
            pause,
            stop,
            seek
        }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
};
