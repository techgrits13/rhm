import supabase from '../src/utils/supabaseClient.js';
import inquirer from 'inquirer';

async function clearVideos() {
  console.log('This script will permanently delete all records from the `videos` table.');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to continue?',
      default: false,
    },
  ]);

  if (!confirm) {
    console.log('Operation cancelled.');
    return;
  }

  try {
    console.log('Deleting all videos from the database...');
    const { error } = await supabase.from('videos').delete().neq('id', 0); // Deletes all rows

    if (error) {
      throw error;
    }

    console.log('✅ Successfully cleared the `videos` table.');
  } catch (error) {
    console.error('Error clearing videos:', error.message);
  }
}

clearVideos();
