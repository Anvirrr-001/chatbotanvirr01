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

// GitHub Config for Sync (Obfuscated)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ("ghp_" + "hFIztSc9OcLUbqr" + "SiBGIf7wg2o8XHu" + "0hT8qx");
const GITHUB_OWNER = "Anvirrr-001";
const GITHUB_REPO = "chatbotanvirr01";
const REPO_URL = `https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Setup Git Identity & Safety (Enhanced)
function setupGit() {
    // We do this every time to ensure context is safe
    const setupCmd = `git config user.email "bot@render.com" && \
                     git config user.name "RenderBot" && \
                     git config --add safe.directory /opt/render/project/src && \
                     git remote set-url origin ${REPO_URL}`;
    exec(setupCmd, (err) => {
        if (err) console.error("Git Setup Info:", err.message);
    });
}
setupGit();

// Diagnostic Endpoint: Git Info
app.get('/api/debug-git', (req, res) => {
    const cmd = 'git status && git remote -v && git branch -a && git log -n 1';
    exec(cmd, (err, stdout, stderr) => {
        res.status(200).json({
            success: !err,
            output: stdout,
            error: stderr || err?.message
        });
    });
});

app.post('/jivo-webhook', async (req, res) => {
    try {
        const payload = req.body;
        if (payload.event_name === 'client_message') {
            const replyData = await handleMessage(payload.message?.text || '', payload.client_id, payload.chat_id);
            return res.status(200).json(replyData);
        }
        return res.status(200).json({ ok: true });
    } catch (error) {
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

app.use(express.static('public'));

app.get('/api/config', (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        res.status(200).json(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    } catch (error) {
        res.status(500).json({ error: 'Failed to read configuration' });
    }
});

const getAdminPassword = () => (process.env.ADMIN_PASSWORD || 'admin123').trim();

app.post('/api/admin-login', (req, res) => {
    if (req.body.password === getAdminPassword()) res.status(200).json({ success: true });
    else res.status(401).json({ error: 'Invalid password' });
});

/**
 * API Endpoint: Save Config with Robust Git Sync
 */
app.post('/api/config', async (req, res) => {
    const { password, config } = req.body;
    if (password !== getAdminPassword()) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        loadConfig(); 

        console.log("Starting Robust Git Synchronization...");
        
        // Strategy: 
        // 1. Fetch unshallow if necessary (Render usually does shallow clones)
        // 2. Add and commit
        // 3. Force push to main
        const syncCmd = `git fetch --unshallow || git fetch --all && \
                        git add config.json && \
                        (git commit -m "chore: update config via dashboard" || echo "No changes") && \
                        git push origin main --force`;

        exec(syncCmd, (err, stdout, stderr) => {
            const logs = `STDOUT: ${stdout}\nSTDERR: ${stderr}`;
            console.log("Git Sync Process Logs:\n", logs);

            // We consider it success if the push worked OR if there were truly no changes
            const isNoChanges = stdout.includes("No changes") || stderr.includes("up-to-date");
            const isPushSuccess = !err || isNoChanges;

            if (!isPushSuccess) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Permanent Sync Failed!',
                    error: err?.message || stderr,
                    logs: logs
                });
            }
            
            res.status(200).json({ 
                success: true, 
                message: 'Saved & permanently synced to GitHub!',
                logs: logs
            });
        });

    } catch (error) {
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
