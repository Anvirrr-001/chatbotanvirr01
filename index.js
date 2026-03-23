require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const { handleMessage, loadConfig } = require('./botLogic');

const app = express();
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Main Webhook Endpoint for JivoChat
app.post('/jivo-webhook', async (req, res) => {
    try {
        const payload = req.body;
        console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

        const eventName = payload.event_name;

        if (eventName === 'client_message') {
            const userMessage = payload.message?.text || '';
            const clientId = payload.client_id;
            const chatId = payload.chat_id;

            const replyData = await handleMessage(userMessage, clientId, chatId);
            return res.status(200).json(replyData);
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

// Serve frontend static files
app.use(express.static('public'));

// Helper to get trimmed admin password
const getAdminPassword = () => (process.env.ADMIN_PASSWORD || 'admin123').trim();

// API Endpoint: Load Config
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

// API Endpoint: Admin Login
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    const ADMIN_PASSWORD = getAdminPassword();
    
    if (password === ADMIN_PASSWORD) {
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

/**
 * API Endpoint: Save Config
 * Implements Git Sync to make changes permanent on Render
 */
app.post('/api/config', (req, res) => {
    const { password, config } = req.body;
    const ADMIN_PASSWORD = getAdminPassword();
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized. Invalid password.' });
    }

    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        
        // Refresh the bot's configuration cache
        loadConfig();
        
        // --- GIT SYNC START ---
        // This ensures changes are permanent by pushing them back to GitHub repository.
        console.log("Initiating Git Sync for config.json...");
        const gitCmd = 'git add config.json && git commit -m "chore: update config via dashboard" && git push origin main';
        
        exec(gitCmd, (err, stdout, stderr) => {
            if (err) {
                console.error("Git Sync Error:", err);
                console.error("Git Stderr:", stderr);
                // We DON'T fail the request here, because the local write succeeded.
                // But logging it is critical.
            } else {
                console.log("Git Sync Success:", stdout);
            }
        });
        // --- GIT SYNC END ---

        res.status(200).json({ success: true, message: 'Configuration saved and synced correctly' });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Web chat testing endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const userMessage = req.body.message || '';
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
    const pass = getAdminPassword();
    console.log(`Debug: ADMIN_PASSWORD loaded correctly. (Length: ${pass.length})`);
});

require('./updateEnv'); // Auto-update .env with IP

// Initialize Telegram testing bot (RE-ENABLED for better accessibility)
try {
    require('./telegramBot');
} catch (e) {
    console.warn("Telegram bot initialization failed:", e.message);
}
