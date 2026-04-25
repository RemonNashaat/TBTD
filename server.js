const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tbtd@5007';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let storedData = { instructions: '', pdfTexts: [] };

app.get('/api/instructions', (req, res) => {
  res.json(storedData);
});

app.post('/api/instructions', (req, res) => {
  storedData = req.body;
  res.json({ success: true });
});

app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  res.json({ success: password === ADMIN_PASSWORD });
});

app.post('/api/ask', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY');
    return res.status(500).json({ error: 'مفتاح API غير موجود' });
  }

  try {
    // تحويل الرسائل لصيغة Gemini
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const payload = {
      contents: contents,
      generationConfig: { maxOutputTokens: 1000 }
    };

    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    console.log('📡 Calling Gemini API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Gemini Error:', errorData);
      return res.status(500).json({ error: 'فشل الاتصال بـ Gemini' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لا يوجد رد';
    
    // إرجاع الرد بنفس صيغة Anthropic عشان الـ frontend يشتغل
    res.json({ content: [{ text }] });

  } catch (err) {
    console.error('💥 Error:', err.message);
    res.status(500).json({ error: 'خطأ في الخادم', details: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ تصدير التطبيق لـ Vercel (مش app.listen)
module.exports = app;
