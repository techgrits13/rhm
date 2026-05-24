import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import NotificationCard from './NotificationCard';

export default function NotificationOverlay() {
    const { currentNotification, dismissNotification } = useNotifications();

    if (!currentNotification) {
        return null;
    }

    return (
        <View style={styles.container} pointerEvents="box-none">
            <NotificationCard
                title={currentNotification.title}
                body={currentNotification.body}
                onDismiss={() => dismissNotification(currentNotification.id)}
                onPress={() => {
                    // Handle navigation if notification has screen data
                    if (currentNotification.data?.screen) {
                        console.log('Navigate to:', currentNotification.data.screen);
                        // Navigation will be handled in App.tsx
                    }
                    dismissNotification(currentNotification.id);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },
});
