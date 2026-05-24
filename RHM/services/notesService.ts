import api, { supabaseApi } from './api';

export interface Note {
  id: number;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NotesResponse {
  success: boolean;
  count: number;
  notes: Note[];
}

export const notesService = {
  // Get all notes for a user
  getNotes: async (userId: string): Promise<Note[]> => {
    try {
      console.log('☁️ Fetching notes from Supabase Edge Function...');
      const response = await supabaseApi.get<Note[]>(`/notes?user_id=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  },

  // Create a new note
  createNote: async (userId: string, title: string, content: string): Promise<Note> => {
    try {
      console.log('☁️ Creating note in Supabase Edge Function...');
      const response = await supabaseApi.post('/notes', {
        user_id: userId,
        title,
        content,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  // Update a note
  updateNote: async (noteId: number, title?: string, content?: string): Promise<Note> => {
    try {
      console.log(`☁️ Updating note '${noteId}' in Supabase Edge Function...`);
      const response = await supabaseApi.post('/notes', { // Using POST for upsert in function
        id: noteId,
        title,
        content,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  },

  // Delete a note
  deleteNote: async (noteId: number): Promise<void> => {
    try {
      console.log(`☁️ Deleting note '${noteId}' from Supabase Edge Function...`);
      await supabaseApi.delete(`/notes/${noteId}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },
};
