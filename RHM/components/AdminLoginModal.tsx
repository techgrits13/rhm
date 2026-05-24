import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AdminLoginModalProps {
    visible: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

const ADMIN_USERNAME = 'esir';
const ADMIN_PASSWORD = '12822Esir@#';
const ADMIN_LOGIN_KEY = 'admin_logged_in';

export default function AdminLoginModal({ visible, onClose, onLoginSuccess }: AdminLoginModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [tapCount, setTapCount] = useState(0);
    const [showUrlField, setShowUrlField] = useState(false);
    const [customUrl, setCustomUrl] = useState('');

    React.useEffect(() => {
        loadCustomUrl();
    }, []);

    const loadCustomUrl = async () => {
        const url = await AsyncStorage.getItem('API_BASE_URL');
        if (url) setCustomUrl(url);
    };

    const handleLogin = async () => {
        setLoading(true);

        // If custom URL is provided, save it
        if (showUrlField) {
            if (customUrl.trim()) {
                await AsyncStorage.setItem('API_BASE_URL', customUrl.trim());
            } else {
                await AsyncStorage.removeItem('API_BASE_URL');
            }
        }

        // Simulate network delay for better UX
        setTimeout(async () => {
            if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                // Save login state
                await AsyncStorage.setItem(ADMIN_LOGIN_KEY, 'true');

                setLoading(false);
                setUsername('');
                setPassword('');
                setTapCount(0);
                setShowUrlField(false);
                onLoginSuccess();
            } else {
                setLoading(false);
                Alert.alert('Login Failed', 'Invalid username or password');
            }
        }, 500);
    };

    const handleShieldTap = () => {
        const next = tapCount + 1;
        setTapCount(next);
        if (next >= 5) {
            setShowUrlField(true);
            setTapCount(0);
            Alert.alert('Secret Unlocked', 'You can now configure the backend URL.');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleShieldTap} activeOpacity={1}>
                            <Ionicons name="shield-checkmark" size={40} color="#6200ee" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Admin Login</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Secret URL Field */}
                    {showUrlField && (
                        <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#fff3e0', borderRadius: 8 }}>
                            <Text style={[styles.label, { color: '#e65100' }]}>Secret Backend URL</Text>
                            <TextInput
                                style={styles.input}
                                value={customUrl}
                                onChangeText={setCustomUrl}
                                placeholder="http://192.168.x.x:5000"
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setCustomUrl('')}>
                                <Text style={{ fontSize: 11, color: '#666', textAlign: 'right' }}>RESET TO DEFAULT</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter username"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        <Text style={styles.label}>Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter password"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off' : 'eye'}
                                    size={20}
                                    color="#666"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="log-in" size={20} color="#fff" />
                                    <Text style={styles.loginButtonText}>Login</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '85%',
        maxWidth: 400,
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    closeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
    },
    form: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        backgroundColor: '#f9f9f9',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 24,
        backgroundColor: '#f9f9f9',
    },
    passwordInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
    },
    eyeButton: {
        padding: 12,
    },
    loginButton: {
        backgroundColor: '#6200ee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
        gap: 8,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
