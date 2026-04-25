const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tbtd@5007';
// ⚠️ تأكد أن اسم المتغير في Vercel هو GEMINI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

let storedData = { instructions: '', pdfTexts: [] };

app.get('/api/instructions', (req, res) => res.json(storedData));
app.post('/api/instructions', (req, res) => { storedData = req.body; res.json({ success: true }); });

app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  res.json({ success: password === ADMIN_PASSWORD });
});

app.post('/api/ask', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير موجود' });
  }

  try {
    // تحويل صيغة الرسائل لتناسب Google Gemini
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

    // الاتصال بـ Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'فشل الاتصال بجوجل', details: data });
    }

    // استخراج الرد
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "لا يوجد رد";
    // إرجاع الرد بنفس الصيغة التي يتوقعها الـ Frontend
    res.json({ content: [{ text }] }); 

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ✅ تصدير التطبيق لـ Vercel (بدون app.listen)
module.exports = app;
