import NetInfo from '@react-native-community/netinfo';

class NetworkMonitor {
    private static instance: NetworkMonitor;
    private isConnected: boolean = true;
    private listeners: Set<(connected: boolean) => void> = new Set();

    private constructor() {
        this.init();
    }

    static getInstance(): NetworkMonitor {
        if (!NetworkMonitor.instance) {
            NetworkMonitor.instance = new NetworkMonitor();
        }
        return NetworkMonitor.instance;
    }

    private init() {
        NetInfo.addEventListener(state => {
            const connected = state.isConnected ?? false;
            if (this.isConnected !== connected) {
                this.isConnected = connected;
                this.notifyListeners();
            }
        });
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }

    subscribe(callback: (connected: boolean) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.isConnected));
    }
}

export default NetworkMonitor.getInstance();
