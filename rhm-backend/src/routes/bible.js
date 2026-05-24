import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/bible/verse/:reference - Fetch Bible verse
router.get('/verse/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    // Using bible-api.com (free, no API key needed)
    const apiUrl = `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`;

    const response = await axios.get(apiUrl, { timeout: 10000 }); // 10 second timeout

    if (response.data && response.data.text) {
      res.json({
        success: true,
        reference: response.data.reference,
        text: response.data.text.trim(),
        translation: response.data.translation_name || 'King James Version',
        verses: response.data.verses || []
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Verse not found',
        reference: reference
      });
    }
  } catch (error) {
    console.error('Error fetching Bible verse:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bible verse',
      message: error.message,
      reference: req.params.reference
    });
  }
});

// GET /api/bible/search - Search Bible verses
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    res.json({
      success: true,
      message: 'Bible search feature - To be implemented in later chunk',
      query: query,
      results: []
    });
  } catch (error) {
    console.error('Error searching Bible:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search Bible',
      message: error.message
    });
  }
});

// GET /api/bible/books - Get list of Bible books
router.get('/books', async (req, res) => {
  try {
    const books = {
      old_testament: [
        'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
        'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
        '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
        'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
        'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
        'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
        'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
        'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
      ],
      new_testament: [
        'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
        '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
        'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
        '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
        'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
        'Jude', 'Revelation'
      ]
    };

    res.json({
      success: true,
      books: books
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch books',
      message: error.message
    });
  }
});

export default router;
