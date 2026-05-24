import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
  },
  adminPassword: process.env.ADMIN_PASSWORD,
  adminUsername: process.env.ADMIN_USERNAME,
  nodeEnv: process.env.NODE_ENV || 'development',
};
