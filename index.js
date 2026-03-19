require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
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
app.get('/api/config', (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        res.status(200).json(JSON.parse(configData));
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ error: 'Failed to read configuration' });
    }
});

app.post('/api/config', (req, res) => {
    const { password, config } = req.body;
    
    // Simple authentication for the admin panel
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized. Invalid password.' });
    }

    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        res.status(200).json({ success: true, message: 'Configuration saved correctly' });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});
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

require('./updateEnv'); // Auto-update .env with IP

// Initialize Telegram testing bot (DISABLED AS PER USER REQUEST)
// require('./telegramBot');
