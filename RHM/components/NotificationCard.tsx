import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationCardProps {
    title: string;
    body: string;
    onDismiss: () => void;
    onPress?: () => void;
}

const { width } = Dimensions.get('window');

export default function NotificationCard({
    title,
    body,
    onDismiss,
    onPress,
}: NotificationCardProps) {
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Slide in animation
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleDismiss = () => {
        // Slide out animation
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        }
        handleDismiss();
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.card}
                onPress={handlePress}
                activeOpacity={0.9}
            >
                <View style={styles.iconContainer}>
                    <Ionicons name="notifications" size={24} color="#6200ee" />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {body}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleDismiss}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 10,
        left: 10,
        right: 10,
        zIndex: 9999,
        elevation: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#6200ee',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0e6ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    body: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    closeButton: {
        padding: 4,
    },
});
