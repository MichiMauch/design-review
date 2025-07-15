import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text, from = 'de', to = 'en' } = await request.json();
    
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${from === 'de' ? 'German' : 'English'} to ${to === 'en' ? 'English' : 'German'}. Keep the translation natural and contextually appropriate for feedback/task management. Return only the translated text without any additional commentary.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      translatedText,
      originalText: text,
      from,
      to
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}