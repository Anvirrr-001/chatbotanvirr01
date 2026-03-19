const fs = require('fs');
const path = require('path');

// In-Memory Session Storage
const userSessions = new Map();

/**
 * Handle incoming message from client
 */
async function handleMessage(messageText, clientId, chatId) {
    const textLower = messageText.toLowerCase().trim();

    // Load Config
    let config = { menus: [], initialMenuId: "main_menu", keywords: [] };
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(raw);
        }
    } catch (e) { console.error("Config Error:", e); }

    let session = userSessions.get(chatId) || { menuId: config.initialMenuId };

    // --- 1. HANDLE DATA COLLECTION STATE ---
    if (session.collectingData) {
        const menu = config.menus.find(m => m.id === session.menuId);
        
        // Handle "Summary Confirmation" step
        if (session.stepIndex >= menu.steps.length) {
            if (textLower === 'হ্যাঁ, সব ঠিক আছে') {
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

    // --- 4. RESET LOGIC ---
    if (['/start', 'hello', 'hi', 'menu', 'শুরু'].includes(textLower)) {
        return transitionToMenu(config.initialMenuId, chatId, config);
    }

    // --- 5. FALLBACK ---
    return renderMenu(session.menuId || config.initialMenuId, config);
}

/**
 * Transitions to a new menu and handles specialized type initialization
 */
function transitionToMenu(menuId, chatId, config) {
    const menu = config.menus.find(m => m.id === menuId);
    if (!menu) return renderMenu(config.initialMenuId, config);

    const session = { menuId: menuId };
    
    if (menu.type === 'data_collection' && menu.steps && menu.steps.length > 0) {
        // Only auto-start if there's no intro text/options, or if explicitly triggered
        // But for simplicity, we'll start it if it has steps.
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
    if (!menu) return renderMenu(config.initialMenuId, config);

    if (menu.type === 'operator') {
        return createOperatorResponse(menu.text);
    }

    const messages = [];
    if (menuId === config.initialMenuId && config.welcomeGreeting) {
        messages.push({ "type": "text", "text": config.welcomeGreeting });
    }
    messages.push({ "type": "text", "text": menu.text });

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
        "event": "bot_message",
        "messages": [{ "type": "text", "text": text || "আমি আপনার চ্যাট টি অপারেটর এর কাছে ট্রান্সফার করতেছি।" }]
    };
}

module.exports = { handleMessage };
