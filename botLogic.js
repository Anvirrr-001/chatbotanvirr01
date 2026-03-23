const fs = require('fs');
const path = require('path');

// In-Memory Session Storage
const userSessions = new Map();

// Session Cleanup Logic: Remove sessions older than 24 hours to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    const expiry = 24 * 60 * 60 * 1000; // 24 hours
    for (const [id, session] of userSessions.entries()) {
        if (session.lastSeen && (now - session.lastSeen > expiry)) {
            userSessions.delete(id);
        }
    }
}, 60 * 60 * 1000); // Check every hour

// In-Memory Configuration Cache
let configCache = { menus: [], initialMenuId: "main_menu", keywords: [], welcomeGreeting: "" };

/**
 * Loads configuration from config.json into memory.
 * Should be called on startup and whenever the config file is updated.
 */
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            configCache = JSON.parse(raw);
            console.log("Configuration cache updated successfully.");
            return true;
        }
    } catch (e) {
        console.error("Config Loading Error:", e);
    }
    return false;
}

// Initial load
loadConfig();

/**
 * Handle incoming message from client
 */
async function handleMessage(messageText, clientId, chatId) {
    try {
        const textLower = messageText.toLowerCase().trim();

        // Use the cached configuration
        const config = configCache;

        // --- 0. PRIORITY RESET CHECK (Always reset on restart command) ---
        if (['/start', 'hello', 'hi', 'menu', 'শুরু'].includes(textLower)) {
            userSessions.delete(chatId);
            return transitionToMenu(config.initialMenuId, chatId, config);
        }

        let session = userSessions.get(chatId) || { menuId: config.initialMenuId };
        session.lastSeen = Date.now();

        // --- 1. HANDLE DATA COLLECTION STATE ---
        if (session.collectingData) {
            const menu = config.menus.find(m => m.id === session.menuId);
            if (!menu || !menu.steps) {
                // Rescue: If menu is missing or broken, reset
                session.collectingData = false;
                return transitionToMenu(config.initialMenuId, chatId, config);
            }
            
            // Handle "Summary Confirmation" step
            if (session.stepIndex >= menu.steps.length) {
                if (textLower === 'হ্যাঁ, সব ঠিক আছে' || textLower === 'হ্যাঁ') {
                    session.collectingData = false;
                    userSessions.set(chatId, session);
                    return renderMenu(menu.confirmationTarget || 'operator_transfer', config);
                } else if (textLower === 'না, কিছু একটা ভুল' || textLower === 'না') {
                    // Restart steps
                    session.stepIndex = 0;
                    session.data = {};
                    userSessions.set(chatId, session);
                    return renderDataCollectionStep(menu, session);
                }
                // If they type something else, just show the summary again
                return renderDataCollectionSummary(menu, session);
            }

            // Store Answer and Advance
            const currentStep = menu.steps[session.stepIndex];
            session.data[currentStep.field] = messageText; // Keep original case for data
            session.stepIndex++;
            userSessions.set(chatId, session);

            if (session.stepIndex < menu.steps.length) {
                return renderDataCollectionStep(menu, session);
            } else {
                return renderDataCollectionSummary(menu, session);
            }
        }

        // --- 2. HANDLE KEYWORD MATCHING ---
        if (config.keywords) {
            for (const kw of config.keywords) {
                if (!kw.trigger) continue; // Skip malformed keywords
                const trigger = kw.trigger.toLowerCase().trim();
                if (textLower.includes(trigger)) {
                    userSessions.delete(chatId);
                    if (kw.responseType === 'operator') return createOperatorResponse(kw.text);
                    if (kw.responseType === 'menu') {
                        return transitionToMenu(kw.target, chatId, config);
                    }
                    return createBotResponse(kw.text);
                }
            }
        }

        // --- 3. HANDLE MENU OPTIONS ---
        const currentMenu = config.menus.find(m => m.id === (session.menuId || config.initialMenuId));
        if (currentMenu && currentMenu.options) {
            const option = currentMenu.options.find(opt => opt.text.toLowerCase() === textLower);
            if (option) {
                return transitionToMenu(option.target, chatId, config);
            }
        }

        // --- 5. FALLBACK / AUTOMATIC RESTART ---
        // If no keyword or option matches, return to starting menu
        return transitionToMenu(config.initialMenuId, chatId, config);

    } catch (globalError) {
        console.error("CRITICAL BOT ERROR:", globalError);
        // Fallback response so the user isn't stuck with a silent bot
        return {
            "messages": [{ "type": "text", "text": "দুঃখিত, আমি এই মুহূর্তে কিছুটা সমস্যায় পড়েছি। দয়া করে একটু পরে চেষ্টা করুন বা সরাসরি অপারেটরের সহায়তা নিন।" }],
            "keyboard": [{ "text": "আবার শুরু করুন" }]
        };
    }
}

/**
 * Transitions to a new menu and handles specialized type initialization
 */
function transitionToMenu(menuId, chatId, config) {
    const menu = config.menus.find(m => m.id === menuId);
    if (!menu) return renderMenu(config.initialMenuId, config);

    const session = { menuId: menuId, lastSeen: Date.now() };
    
    if (menu.type === 'data_collection' && menu.steps && menu.steps.length > 0) {
        session.collectingData = true;
        session.stepIndex = 0;
        session.data = {};
        userSessions.set(chatId, session);
        return renderDataCollectionStep(menu, session);
    }

    userSessions.set(chatId, session);
    return renderMenu(menuId, config);
}

/**
 * Render standard menu
 */
function renderMenu(menuId, config) {
    const menu = config.menus.find(m => m.id === menuId);
    if (!menu) {
        // Fallback to start if target menu is missing
        const startMenu = config.menus.find(m => m.id === config.initialMenuId);
        if (!startMenu) return createBotResponse("Error: Bot not configured correctly.");
        return renderMenu(config.initialMenuId, config);
    }

    if (menu.type === 'operator') {
        return createOperatorResponse(menu.text);
    }

    const messages = [];
    if (menuId === config.initialMenuId && config.welcomeGreeting) {
        messages.push({ "type": "text", "text": config.welcomeGreeting });
    }
    messages.push({ "type": "text", "text": menu.text || "আপনার প্রশ্নের টপিক সিলেক্ট করুন।" });

    const response = { "messages": messages };
    if (menu.options && menu.options.length > 0) {
        response.keyboard = menu.options.map(opt => ({ "text": opt.text }));
    }
    return response;
}

/**
 * Render a step in a data collection flow
 */
function renderDataCollectionStep(menu, session) {
    const step = menu.steps[session.stepIndex];
    return {
        "messages": [{ "type": "text", "text": step.question }]
    };
}

/**
 * Render the final summary of collected data
 */
function renderDataCollectionSummary(menu, session) {
    let text = menu.summaryTemplate || "সব কিছু ঠিক আছে?";
    for (const [key, value] of Object.entries(session.data)) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return {
        "messages": [{ "type": "text", "text": text }],
        "keyboard": [
            { "text": "হ্যাঁ, সব ঠিক আছে" },
            { "text": "না, কিছু একটা ভুল" }
        ]
    };
}

function createBotResponse(text) {
    return { "messages": [{ "type": "text", "text": text }] };
}

function createOperatorResponse(text) {
    return {
        "event": "operator_transfer",
        "messages": [{ "type": "text", "text": text || "আমি আপনার চ্যাট টি অপারেটর এর কাছে ট্রান্সফার করতেছি।" }]
    };
}

module.exports = { handleMessage, loadConfig };
