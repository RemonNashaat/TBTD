let storedData = { instructions: '', pdfTexts: [] };

export default function handler(req, res) {
    if (req.method === 'GET') {
        return res.json(storedData);
    }
    if (req.method === 'POST') {
        storedData = { ...storedData, ...req.body };
        return res.json({ success: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
}
