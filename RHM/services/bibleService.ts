import api, { supabaseApi } from './api';

export interface BibleVerse {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleVerseResponse {
  success: boolean;
  reference: string;
  text: string;
  translation: string;
  verses: BibleVerse[];
}

export interface BibleBooks {
  old_testament: string[];
  new_testament: string[];
}

export const bibleService = {
  // Get a specific verse
  getVerse: async (reference: string): Promise<BibleVerseResponse> => {
    try {
      console.log(`☁️ Fetching verse '${reference}' from Supabase Edge Function...`);
      const response = await supabaseApi.get<BibleVerseResponse>(`/bible/verse/${encodeURIComponent(reference)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching verse:', error);
      throw error;
    }
  },

  // Get list of all Bible books
  getBooks: async (): Promise<BibleBooks> => {
    try {
      console.log('☁️ Fetching Bible books from Supabase Edge Function...');
      const response = await supabaseApi.get('/bible/books');
      return response.data.books;
    } catch (error) {
      console.error('Error fetching books:', error);
      throw error;
    }
  },

  // Search Bible verses
  searchVerses: async (query: string): Promise<any> => {
    try {
      console.log(`☁️ Searching Bible for '${query}' via Supabase Edge Function...`);
      const response = await supabaseApi.get(`/bible/search?query=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('Error searching verses:', error);
      throw error;
    }
  },
};
