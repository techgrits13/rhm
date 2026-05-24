import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
// Use EXPO_PUBLIC_API_BASE_URL when provided.
// Otherwise pick a sensible default based on build type: local IP for development, Render URL for production builds.
const LOCAL_FALLBACK_URL = 'http://localhost:5000/api';
const PRODUCTION_FALLBACK_URL = 'https://rhm-backend-2.onrender.com/api';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_BASE_URL || PRODUCTION_FALLBACK_URL;
const SUPABASE_PROJECT_ID = 'tlcerhzcnhhzqbocmjsd'; 
const SUPABASE_FUNCTIONS_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

console.log('🌐 Default API Base URL:', API_BASE_URL);
console.log('☁️ Supabase Functions URL:', SUPABASE_FUNCTIONS_URL);

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

// Extend AxiosRequestConfig to include metadata
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: { retryCount: number };
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseApi = axios.create({
  baseURL: SUPABASE_FUNCTIONS_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
});

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors, timeouts - retry
    return true;
  }

  const status = error.response.status;
  // Retry on 5xx errors and 429 (rate limit)
  return status >= 500 || status === 429;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Request interceptor for retry and dynamic base URL logic
api.interceptors.request.use(
  async (config: CustomAxiosRequestConfig) => {
    // Check for custom API URL override in storage
    try {
      const customUrl = await AsyncStorage.getItem('API_BASE_URL');
      if (customUrl) {
          // If custom URL doesn't have /api suffix, add it (backend expected)
          const formattedUrl = customUrl.endsWith('/api') ? customUrl : `${customUrl}/api`;
          config.baseURL = formattedUrl;
      }
    } catch (e) {
      console.warn('Failed to load custom API URL', e);
    }

    // Add retry metadata
    if (!config.metadata) {
      config.metadata = { retryCount: 0 };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and retry
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;

    if (!config || !config.metadata) {
      console.error('API Error:', error.message);
      return Promise.reject(error);
    }

    const { retryCount } = config.metadata;

    // Check if we should retry
    if (retryCount < MAX_RETRIES && isRetryableError(error)) {
      config.metadata.retryCount++;
      const delay = getRetryDelay(retryCount);

      console.log(`⏳ Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms...`);

      await sleep(delay);

      return api.request(config);
    }

    // Max retries exceeded or non-retryable error
    if (error.response) {
      console.error(`API Error (${error.response.status}):`, error.message);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    } else {
      console.error('Request Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL, supabaseApi, SUPABASE_FUNCTIONS_URL };
