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

// GitHub Config for Sync
// IMPORTANT: Set GITHUB_TOKEN in your Render Dashboard environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_OWNER = "Anvirrr-001";
const GITHUB_REPO = "chatbotanvirr01";
const REPO_URL = GITHUB_TOKEN ? `https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git` : "";

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Setup Git Identity for Render environment
function setupGit() {
    console.log("Setting up Git identity...");
    exec('git config user.email "bot@render.com" && git config user.name "RenderBot"', (err) => {
        if (err) console.error("Git Identity Error:", err);
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
 * Uses Explicit Token URL to ensure persistence on Render
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

        if (!REPO_URL) {
            return res.status(500).json({ 
                success: false, 
                message: 'GITHUB_TOKEN is not configured on the server. Sync failed.' 
            });
        }

        console.log("Starting Git Synchronization...");
        
        // Complex sync: pull (rebase) -> add -> commit -> push
        const syncCmd = `git add config.json && \
                        git commit -m "chore: update config via dashboard" || echo "No changes to commit" && \
                        git pull --rebase ${REPO_URL} main && \
                        git push ${REPO_URL} main`;

        exec(syncCmd, (err, stdout, stderr) => {
            if (err && !stderr.includes("Everything up-to-date") && !stderr.includes("nothing to commit")) {
                console.error("Git Sync FAILED:", err);
                console.error("Git Stderr:", stderr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Sync failed. Content will revert on restart.',
                    error: stderr || err.message
                });
            }
            
            console.log("Git Sync SUCCESS:", stdout);
            res.status(200).json({ 
                success: true, 
                message: 'Saved & permanently synced to GitHub!' 
            });
        });

    } catch (error) {
        console.error('Save Error:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
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
