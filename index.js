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

// Setup Git Identity for Render environment
function setupGit() {
    console.log("Setting up Git identity...");
    // Force identity for every instance
    exec('git config user.email "bot@render.com" && git config user.name "RenderBot"', (err) => {
        if (err) console.error("Git Identity Error:", err);
        else console.log("Git Identity configured.");
    });
}
setupGit();

// Main Webhook Endpoint for JivoChat
app.post('/jivo-webhook', async (req, res) => {
    try {
        const payload = req.body;
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

app.use(express.static('public'));

const getAdminPassword = () => (process.env.ADMIN_PASSWORD || 'admin123').trim();

app.get('/api/config', (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        res.status(200).json(JSON.parse(configData));
    } catch (error) {
        res.status(500).json({ error: 'Failed to read configuration' });
    }
});

app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === getAdminPassword()) res.status(200).json({ success: true });
    else res.status(401).json({ error: 'Invalid password' });
});

/**
 * API Endpoint: Save Config with Synchronous Git Push
 */
app.post('/api/config', async (req, res) => {
    const { password, config } = req.body;
    if (password !== getAdminPassword()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        loadConfig(); // Update memory cache

        console.log("Starting Git Synchronization...");
        
        // Complex sync: pull first to avoid non-fast-forward, then commit and push.
        // We use --rebase to keep history clean and avoid merge commits in this automated flow.
        const syncCmd = `git config user.email "bot@render.com" && \
                        git config user.name "RenderBot" && \
                        git add config.json && \
                        git commit -m "chore: update config via dashboard" && \
                        git pull --rebase origin main && \
                        git push origin main`;

        exec(syncCmd, (err, stdout, stderr) => {
            if (err) {
                console.error("Git Sync FAILED:", err);
                console.error("Git Stderr:", stderr);
                // Even if git fails, we saved locally. But we tell the user it didn't sync permanently.
                return res.status(500).json({ 
                    success: false, 
                    message: 'Saved locally, but permanent sync failed. Content will revert on next restart.',
                    error: stderr || err.message
                });
            }
            
            console.log("Git Sync SUCCESS:", stdout);
            res.status(200).json({ 
                success: true, 
                message: 'Configuration saved and permanently synced to GitHub!' 
            });
        });

    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ error: 'Failed to save configuration locally' });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const replyData = await handleMessage(req.body.message || '', req.ip, 'web_chat_' + req.ip);
        res.status(200).json(replyData);
    } catch (error) {
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

require('./updateEnv');
try { require('./telegramBot'); } catch (e) {}
