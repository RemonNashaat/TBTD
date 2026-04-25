export default async function verifyPassword(req, res) {
    if (req.method === 'POST') {
        const { password } = req.body;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Tbtd@5007';
        const success = password === ADMIN_PASSWORD;

        res.status(200).json({ success });
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}