require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { handleMessage } = require('./botLogic');

const app = express();
app.use(cors());
app.use(express.json());

// Main Webhook Endpoint for JivoChat
app.post('/jivo-webhook', async (req, res) => {
    try {
        const payload = req.body;
        console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

        // JivoChat Bot API generally sends event_name
        const eventName = payload.event_name;

        // When a user sends a message
        if (eventName === 'client_message') {
            const userMessage = payload.message?.text || '';
            const clientId = payload.client_id;
            const chatId = payload.chat_id;

            // Get bot's reply from our logic engine
            const replyData = await handleMessage(userMessage, clientId, chatId);

            // Respond instantly back to JivoChat webhook request
            return res.status(200).json(replyData);
        }

        // Just acknowledge other events (like chat_accepted, chat_finished, etc.)
        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// Serve frontend static files
app.use(express.static('public'));

// API Endpoint for Web Chat Interface
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message || '';
        // Create a unique session ID based on IP or just a random string for simplicity
        const clientId = req.ip || 'web_user_' + Date.now();
        const chatId = 'web_chat_' + clientId;
        
        const replyData = await handleMessage(userMessage, clientId, chatId);
        res.status(200).json(replyData);
    } catch (error) {
        console.error('Web Chat error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`JivoChat bot server running on port ${PORT}`);
});

// Start Telegram Bot Integration locally
require('./telegramBot');
