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
  
  console.log('📩 API Request:', { messages, systemPrompt });
  console.log('🔑 Has API Key:', !!ANTHROPIC_API_KEY);
  
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ Missing ANTHROPIC_API_KEY');
    return res.status(500).json({ error: 'API key غير موجود' });
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt || 'أنت مساعد تعليمات الشركة',
        messages: messages || []
      })
    });
    
    console.log('📡 Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Success:', data);
    res.json(data);
    
  } catch (err) {
    console.error('💥 Error:', err.message);
    res.status(500).json({ 
      error: 'حدث خطأ',
      details: err.message 
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ تصدير لـ Vercel (مش app.listen)
module.exports = app;
