import express from 'express';
import supabase from '../utils/supabaseClient.js';

const router = express.Router();

// GET /api/notes - Fetch all notes for a user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id query parameter is required'
      });
    }

    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      notes: data || []
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notes',
      message: error.message
    });
  }
});

// POST /api/notes - Create a new note
router.post('/', async (req, res) => {
  try {
    const { user_id, title, content } = req.body;

    if (!user_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'user_id, title, and content are required'
      });
    }

    const { data, error } = await supabase
      .from('user_notes')
      .insert([{
        user_id,
        title,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note: data
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create note',
      message: error.message
    });
  }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (title or content) is required'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;

    const { data, error } = await supabase
      .from('user_notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    res.json({
      success: true,
      message: 'Note updated successfully',
      note: data
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update note',
      message: error.message
    });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete note',
      message: error.message
    });
  }
});

export default router;
