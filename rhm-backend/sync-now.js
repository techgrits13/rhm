import dotenv from 'dotenv';
dotenv.config();
import { checkForNewVideos } from './src/services/youtubeService.js';

console.log("Starting manual database sync...");
checkForNewVideos()
  .then(count => {
    console.log(`Sync complete! Processed ${count} new videos.`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
