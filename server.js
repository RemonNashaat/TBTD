const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration - استخدم متغيرات البيئة
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tbtd@5007';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // ⚠️ تأكد من إضافة هذا في Vercel

// تخزين مؤقت (تنبيه: سيتم إعادة تعيينه عند كل Cold Start في Vercel)
let storedData = { instructions: '', pdfTexts: [] };

// ==================== ROUTES ====================

// جلب التعليمات
app.get('/api/instructions', (req, res) => {
  res.json(storedData);
});

// حفظ التعليمات
app.post('/api/instructions', (req, res) => {
  storedData = req.body;
  res.json({ success: true });
});

// التحقق من كلمة مرور المدير
app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  res.json({ success: password === ADMIN_PASSWORD });
});

// 🤖 سؤال الذكاء الاصطناعي (Google Gemini)
app.post('/api/ask', async (req, res) => {
  const { messages, systemPrompt } = req.body;

  // 1. التحقق من وجود مفتاح API
  if (!GEMINI_API_KEY) {
    console.error('❌ Missing GEMINI_API_KEY');
    return res.status(500).json({ 
      error: 'مفتاح GEMINI_API_KEY غير موجود',
      hint: 'أضفه في Vercel > Settings > Environment Variables'
    });
  }

  try {
    console.log('📡 Calling Google Gemini API...');

    // 2. تحويل صيغة الرسائل لتناسب Gemini
    // Gemini يتوقع: role: 'user' أو 'model' (ليس 'assistant')
    const contents = (messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })).filter(m => m.parts[0]?.text?.trim()); // استبعاد الرسائل الفارغة

    // 3. تجهيز جسم الطلب
    const payload = {
      contents: contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    };

    // إضافة تعليمات النظام إذا وجدت
    if (systemPrompt && systemPrompt.trim()) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    // 4. الاتصال بـ Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    // 5. معالجة الاستجابة
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Gemini API Error:', response.status, errorData);
      
      return res.status(500).json({
        error: 'فشل الاتصال بـ Google Gemini',
        status: response.status,
        details: errorData.error?.message || 'تحقق من صحة المفتاح ونموذج الـ API'
      });
    }

    const data = await response.json();
    console.log('✅ Gemini API Success');

    // 6. استخراج النص من الرد
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع فهم السؤال.';

    // 7. إرجاع الرد بنفس الصيغة التي يتوقعها الـ Frontend
    // (نفس هيكل رد Anthropic عشان الكود القديم يشتغل)
    res.json({ 
      content: [{ text }],
      model: 'gemini-1.5-flash'
    });

  } catch (err) {
    console.error('💥 Unexpected Error in /api/ask:', err.message);
    res.status(500).json({ 
      error: 'حدث خطأ غير متوقع في الخادم',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Serve frontend for all other routes (SPA Fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ تصدير التطبيق لـ Vercel (Serverless) - بدلاً من app.listen()
module.exports = app;
