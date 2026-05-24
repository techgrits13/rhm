import cron from 'node-cron';
import { checkForNewVideos } from '../services/youtubeService.js';

console.log('📅 Scheduler started. Scheduling YouTube sync every 15 minutes.');

// Run immediately on boot
(async () => {
  try {
    const count = await checkForNewVideos();
    console.log(`⚡ Initial sync complete. New videos: ${count}`);
  } catch (e) {
    console.error('Initial sync failed:', e?.message || e);
  }
})();

// Every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('⏱️ Running scheduled YouTube sync');
    const count = await checkForNewVideos();
    console.log(`✅ Scheduled sync done. New videos: ${count}`);
  } catch (e) {
    console.error('Scheduled sync failed:', e?.message || e);
  }
});

// Keep process alive
setInterval(() => {}, 1 << 30);
