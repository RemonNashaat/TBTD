const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tbtd@5007';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

  // 1. التحقق من وجود المفتاح
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY');
    return res.status(500).json({ error: 'API key غير موجود' });
  }

  try {
    console.log('📡 Calling Anthropic API...');
    
    // 2. استخدام النموذج الصحيح (تم إصلاح الخطأ هنا)
    const modelToUse = 'claude-3-5-sonnet-20241022';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelToUse, // ✅ هنا الإصلاح: اسم واحد فقط
        max_tokens: 1000,
        system: systemPrompt || 'أنت مساعد تعليمات الشركة.',
        messages: messages || []
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Error:', response.status, errorData);
      
      // لو الخطأ في المفتاح، ارسل رسالة واضحة للمستخدم
      if (response.status === 401) {
        return res.status(500).json({ 
          error: 'خطأ في مفتاح الـ API (Unauthorized)',
          details: 'تأكد أن المفتاح صحيح ومفعل في Vercel Environment Variables'
        });
      }
      return res.status(response.status).json({ error: 'فشل الاتصال بـ Anthropic' });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('💥 Unexpected Error:', err);
    res.status(500).json({ error: 'خطأ داخلي في الخادم', details: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
