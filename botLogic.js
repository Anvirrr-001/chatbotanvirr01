const fs = require('fs');
const path = require('path');

// In-Memory Session Storage for Multi-Step Flows
const userSessions = new Map();

/**
 * Handle incoming message from client
 * @param {string} messageText 
 * @param {string|number} clientId 
 * @param {string|number} chatId 
 * @returns {object} JivoChat formatted response JSON
 */
async function handleMessage(messageText, clientId, chatId) {
    const textLower = messageText.toLowerCase().trim();
    const textNoSpace = textLower.replace(/\s+/g, '');

    // Read dynamic configuration
    let config = {
        botName: "ELON সাহায্যকারী",
        welcomeGreeting: "স্বাগতম, কাস্টমার সাপোর্ট আপনাকে শুভেচ্ছ জানাতে পেরে আনন্দিত। 👋",
        welcomeMenuText: "আপনার প্রশ্নের টপিক সিলেক্ট করুন।",
        welcomeMenu: ["💰 পেমেন্ট", "👨‍💻 Contact Operator"],
        keywords: []
    };

    try {
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(data);
        }
    } catch (error) {
        console.error("Error reading config.json:", error);
    }

    // Check active session for multi-step data collection
    let session = userSessions.get(chatId);

    // 1. Check for basic Contact Operator command first (anytime)
    if (textLower.includes('contact operator') || textLower.includes('লাইভ এজেন্ট') || textLower.includes('talk to human') || textLower === 'operator') {
        userSessions.delete(chatId); // clear any active flow
        return {
            "event": "bot_message",
            "messages": [
                {
                    "type": "text",
                    "text": "আমি আপনার চ্যাট টি অপারেটর এর কাছে ট্রান্সফার করতেছি।"
                }
            ]
        };
    }

    // Handle Global Back / Operator Transitions
    if (textLower.includes('মেনুতে ফিরে যান')) {
        userSessions.delete(chatId);
        return createMenuResponse(
            config.welcomeGreeting,
            config.welcomeMenuText,
            config.welcomeMenu
        );
    }

    if (textLower.includes('ইতিমধ্যে একটি অনুরোধ জমা দিয়েছি')) {
        userSessions.delete(chatId);
        return {
            "event": "bot_message",
            "messages": [
                {
                    "type": "text",
                    "text": "অনুগ্রহ করে অপেক্ষা করুন, একজন অপারেটর আপনার সাথে যুক্ত হবেন।"
                }
            ]
        };
    }

    // 2. Welcome Menu (if user says hello, hi, start, or any generic initial greeting)
    if (textLower === '/start' || textLower.includes('hello') || textLower.includes('hi') || textLower === 'menu' || textLower === 'হ্যালো' || textLower === 'হ্যালো!') {
        userSessions.delete(chatId); // reset session
        return createMenuResponse(
            config.welcomeGreeting,
            config.welcomeMenuText,
            config.welcomeMenu
        );
    }

    // --- HARDCODED PAYMENT FLOW (Kept for complexity, can be moved to config later if needed) ---
    if (textLower === '💰 পেমেন্ট' || textLower === 'পেমেন্ট') {
        userSessions.delete(chatId);
        return createMenuResponse(
            "ডিপোজিট নিয়ে আপনার প্রশ্নটি উল্লেখ করুন।",
            "",
            [
                "ডিপোজিট জমা হয় নি",
                "দীর্ঘ উত্তোলন",
                "ডিপোজিট তথ্য",
                "উত্তোলন তথ্য",
                "⬅ মেনুতে ফিরে যান"
            ]
        );
    }

    if (textLower.includes('উত্তোলন তথ্য')) {
        userSessions.delete(chatId);
        return createMenuResponse(
            "উত্তোলন সম্পর্কে আপনার প্রশ্ন উল্লেখ করুন",
            "",
            [
                "কিভাবে উত্তোলন করবো?",
                "উত্তোলনে সমস্যা",
                "উত্তোলন ফি",
                "উত্তোলনের লিমিট",
                "টাকা পাই নি",
                "👨‍💻 Contact Operator",
                "⬅ মেনুতে ফিরে যান"
            ]
        );
    }

    if (textLower.includes('ডিপোজিট তথ্য')) {
        userSessions.delete(chatId);
        return createMenuResponse(
            "ডিপোজিট সম্পর্কে আপনার প্রশ্ন উল্লেখ করুন",
            "",
            [
                "কিভাবে ডিপোজিট করবো?",
                "ডিপোজিটে সমস্যা",
                "ডিপোজিট ফি",
                "ডিপোজিট লিমিট",
                "ডিপোজিট জমা হয় নি",
                "👨‍💻 Contact Operator",
                "⬅ মেনুতে ফিরে যান"
            ]
        );
    }

    // More hardcoded flows ... (simplified for now to focus on Dynamic keywords)
    if (textLower.includes('ডিপোজিট জমা হয়') || textLower.includes('ডিপোজিট জমা হয়')) {
        userSessions.set(chatId, { flow: 'SELECT_DEPOSIT_METHOD' });
        return createMenuResponse(
            "অনুগ্রহ করে আপনি যে পেমেন্ট পদ্ধতিটি ব্যবহার করেছেন তা নির্বাচন করুন। এটি আমাদেরকে আপনার আমানত দ্রুত অনুসন্ধান করতে সাহায্য করে 👇",
            "",
            ["Bkash FAST", "Nagad FAST", "Rocket"]
        );
    }

    if (textLower.includes('উত্তোলন করেছি কিন্তু টাকা') || textLower.includes('দীর্ঘ উত্তোলন')) {
        userSessions.set(chatId, { flow: 'SELECT_WITHDRAWAL_METHOD' });
        return createMenuResponse(
            "দয়া করে আপনি যে পেমেন্ট পদ্ধতিটি ব্যবহার করেছেন তা নির্বাচন করুন। এটি আমাদেরকে আপনার উত্তোলনটি দ্রুত অনুসরণ করতে সাহায্য করে 👇",
            "",
            ["Bkash FAST", "Nagad FAST", "Bkash Nagad Rocket Upay"]
        );
    }

    // Multi-step logic (keeping existing functionality)
    if (session && session.flow === 'SELECT_DEPOSIT_METHOD' && (textLower.includes('fast') || textLower.includes('rocket'))) {
        session.flow = 'DEPOSIT';
        session.method = messageText;
        return createMenuResponse(
            "দারুন পছন্দ! এখন, আপনার আমানত সম্পর্কে আমাদের আরও কিছু তথ্যের প্রয়োজন হবে। আপনাকে লিখতে হবে:\n\n1. পরিমাণ\n2. ইউজার আইডি\n3. ট্রানজেকশন আইডি\n4. ওয়ালেট নম্বর\n5. জমা দেওয়ার তারিখ-সময়\n\nএর পরে, আপনার ডায়ালগটি অপারেটরের কাছে স্থানান্তরিত হবে এবং তিনি নিশ্চিত করবেন যে আপনার আবেদনটি গৃহীত হয়েছে।\n\nএগিয়ে যাওয়ার জন্য প্রস্তুত?",
            "",
            ["হ্যাঁ, আমি প্রস্তুত", "আমি ইতিমধ্যে একটি অনুরোধ জমা দিয়েছি", "মেনুতে ফিরে যান"]
        );
    }

    if (session && session.flow === 'SELECT_WITHDRAWAL_METHOD') {
         session.flow = 'WITHDRAWAL';
         session.method = messageText;
         return createMenuResponse(
            "দারুন পছন্দ! এখন, আপনার আমানত সম্পর্কে আমাদের আরও কিছু তথ্যের প্রয়োজন হবে। আপনাকে লিখতে হবে:\n\n1. পরিমাণ\n2. ইউজার আইডি\n3. ওয়ালেট নম্বর\n4. উত্তোলন এর তারিখ-সময়\n\nএর পরে, আপনার ডায়ালগটি অপারেটরের কাছে স্থানান্তরিত হবে এবং তিনি নিশ্চিত করবেন যে আপনার আবেদনটি গৃহীত হয়েছে।\n\nএগিয়ে যাওয়ার জন্য প্রস্তুত?",
            "",
            ["হ্যাঁ, আমি প্রস্তুত", "আমি ইতিমধ্যে একটি অনুরোধ জমা দিয়েছি", "মেনুতে ফিরে যান"]
        );
    }

    // Step by step collectors (ASK_AMOUNT, ASK_USER_ID, etc.) - abbreviated for brevity but keeping logic
    if (session && (session.flow === 'DEPOSIT' || session.flow === 'WITHDRAWAL')) {
        if (textLower === 'হ্যাঁ, আমি প্রস্তুত') {
            session.step = 'ASK_AMOUNT';
            return createBotResponse(session.flow === 'DEPOSIT' ? "আপনার ডিপোজিটের পরিমাণ কত? 💰" : "আপনার উত্তোলনের পরিমাণ কত? 💰");
        }
        
        if (session.step === 'ASK_AMOUNT') {
            session.amount = messageText;
            session.step = 'ASK_USER_ID';
            return createBotResponse("আপনার ইউজার আইডি কত? 👤");
        }

        if (session.step === 'ASK_USER_ID') {
            session.userId = messageText;
            if (session.flow === 'DEPOSIT') {
                session.step = 'ASK_TXN_ID';
                return createBotResponse("আপনার ট্রানজেকশন আইডি প্রদান করুন। 📝");
            } else {
                session.step = 'ASK_WALLET';
                return createBotResponse("উত্তোলনের জন্য ব্যবহৃত ওয়ালেট নম্বরটি শেয়ার করতে পারবেন? 🏦");
            }
        }

        if (session.step === 'ASK_TXN_ID') {
            session.txnId = messageText;
            session.step = 'ASK_WALLET';
            return createBotResponse("ডিপোজিটের জন্য ব্যবহৃত ওয়ালেট নম্বরটি শেয়ার করতে পারবেন? 🏦");
        }

        if (session.step === 'ASK_WALLET') {
            session.wallet = messageText;
            session.step = 'ASK_DATE';
            return createBotResponse("তারিখ এবং সময় অনুগ্রহ করে 📅⏰");
        }

        if (session.step === 'ASK_DATE') {
            session.date = messageText;
            session.step = 'REVIEW';
            const info = session.flow === 'DEPOSIT' 
                ? `ইউজার আইডি: ${session.userId}\nপরিমান: ${session.amount}\nট্রানজেকশন আইডি: ${session.txnId}\nওয়ালেট: ${session.wallet}\nতারিখ: ${session.date}`
                : `ইউজার আইডি: ${session.userId}\nপরিমান: ${session.amount}\nওয়ালেট: ${session.wallet}\nতারিখ: ${session.date}`;
            
            return createMenuResponse(
                `পর্যালোচনা করুন:\n\n${info}\n\nসব কিছু ঠিক আছে?`,
                "",
                ["হ্যাঁ, সব ঠিক আছে", "না, কিছু একটা ভুল"]
            );
        }

        if (session.step === 'REVIEW') {
            if (textLower === 'হ্যাঁ, সব ঠিক আছে') {
                userSessions.delete(chatId);
                return {
                    "event": "bot_message",
                    "messages": [{ "type": "text", "text": "দারুণ! আপনাকে অপারেটরের সাথে যুক্ত করা হচ্ছে।💰" }]
                };
            }
            userSessions.delete(chatId);
            return createBotResponse("অনুগ্রহ করে পুনরায় শুরু করুন।");
        }
    }

    // 3. Dynamic Keyword Matching from config.json
    if (config.keywords && Array.isArray(config.keywords)) {
        for (const kw of config.keywords) {
            const trigger = kw.trigger.toLowerCase().trim();
            const isMatch = kw.exactMatch ? textLower === trigger : textLower.includes(trigger);
            
            if (isMatch) {
                userSessions.delete(chatId);
                if (kw.responseType === 'operator') {
                    return {
                        "event": "bot_message",
                        "messages": [{ "type": "text", "text": kw.text || "ট্রান্সফার করা হচ্ছে..." }]
                    };
                } else if (kw.responseType === 'menu') {
                    return createMenuResponse(kw.text, kw.menuText || "", kw.options || []);
                } else {
                    return createBotResponse(kw.text);
                }
            }
        }
    }

    // 4. Default Fallback
    return createMenuResponse(
        config.welcomeGreeting,
        config.welcomeMenuText,
        config.welcomeMenu
    );
}

function createBotResponse(text) {
    return { "messages": [{ "type": "text", "text": text }] };
}

function createMenuResponse(greeting, menuText, buttonsArray) {
    const response = { "messages": [{ "type": "text", "text": greeting }] };
    if (menuText) response.messages.push({ "type": "text", "text": menuText });
    response.keyboard = (buttonsArray || []).map(btnText => ({ "text": btnText }));
    return response;
}

module.exports = { handleMessage };

