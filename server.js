const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tbtd@5007';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// تخزين مؤقت في الذاكرة (تنبيه: Vercel Serverless يعيد تعيينه عند الخمول)
let storedData = { instructions: '', pdfTexts: [] };

// Routes
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

  if (!ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY');
    return res.status(500).json({ error: 'API key غير موجود في إعدادات المشروع' });
  }

  try {
    console.log('📡 Calling Anthropic API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        // ✅ تم تعديل الموديل لنسخة مستقرة ومتاحة حالياً
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt || 'أنت مساعد تعليمات الشركة. أجب بدقة ووضوح.',
        messages: messages || []
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Anthropic API Error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'فشل الاتصال بالذكاء الاصطناعي',
        details: errorData.error?.message || 'تحقق من صحة الـ API Key'
      });
    }

    const data = await response.json();
    console.log('✅ Anthropic API Success');
    res.json(data);
  } catch (err) {
    console.error('💥 Unexpected Error:', err.message);
    res.status(500).json({ error: 'خطأ غير متوقع في الخادم', details: err.message });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ تصدير التطبيق لـ Vercel (بدلاً من app.listen)
module.exports = app;
