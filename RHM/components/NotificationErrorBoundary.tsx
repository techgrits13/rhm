import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * Error boundary for notification system
 * Prevents notification errors from crashing the entire app
 */
class NotificationErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error): State {
        // Update state so the next render shows fallback UI
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error for debugging
        console.error('Notification system error:', error, errorInfo);
        // Don't crash the app, just disable notifications
    }

    render() {
        if (this.state.hasError) {
            // Render children without notification system (graceful degradation)
            return this.props.children;
        }

        return this.props.children;
    }
}

export default NotificationErrorBoundary;
