const express = require('express');
const router = express.Router();

// Handler for GET requests
router.get('/', (req, res) => {
    res.send('GET request received');
});

// Handler for POST requests
router.post('/', (req, res) => {
    const data = req.body;
    res.send(`POST request received with data: ${JSON.stringify(data)}`);
});

module.exports = router;