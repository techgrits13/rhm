// @ts-ignore: Deno URL import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').filter(Boolean)
    
    // Pattern: /bible/verse/:reference
    if (path.includes('verse')) {
      const reference = decodeURIComponent(path[path.indexOf('verse') + 1])
      const apiUrl = `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`
      
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('Verse not found')
      
      const data = await response.json()
      
      return new Response(JSON.stringify({
        success: true,
        reference: data.reference,
        text: data.text.trim(),
        translation: data.translation_name || 'King James Version',
        verses: data.verses || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Pattern: /bible/books
    if (path.includes('books')) {
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
      }
      
      return new Response(JSON.stringify({ success: true, books }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Pattern: /bible/search?query=xxx
    if (path.includes('search')) {
      const queryParams = new URLSearchParams(url.search)
      const query = queryParams.get('query') || ''
      const apiUrl = `https://bible-api.com/${encodeURIComponent(query)}?translation=kjv`
      
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
