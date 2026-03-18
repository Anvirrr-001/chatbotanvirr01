const { OpenAI } = require('openai');

// In-Memory Session Storage for Multi-Step Flows
const userSessions = new Map();

const useOpenAI = process.env.USE_OPENAI === 'true';

let openaiClient = null;
if (useOpenAI && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

/**
 * Handle incoming message from client
 * @param {string} messageText 
 * @param {string|number} clientId 
 * @param {string|number} chatId 
 * @returns {object} JivoChat formatted response JSON
 */
async function handleMessage(messageText, clientId, chatId) {
    const textLower = messageText.toLowerCase();

    // Check active session for multi-step data collection
    let session = userSessions.get(chatId);

    // 1. Check for basic Contact Operator command first (anytime)
    if (textLower.includes('contact operator') || textLower.includes('লাইভ এজেন্ট') || textLower.includes('talk to human')) {
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

    // 2. Welcome Menu (if user says hello, hi, start, or any generic initial greeting)
    if (textLower === '/start' || textLower.includes('hello') || textLower.includes('hi') || textLower === 'menu' || textLower === 'হ্যালো' || textLower === 'হ্যালো!' || textLower.includes('মেনুতে ফিরে যান')) {
        userSessions.delete(chatId); // reset session
        return createMenuResponse(
            "হ্যালো, কাস্টমার সাপোর্ট এ যোগাযোগ করার জন্য ধন্যবাদ 👋",
            "আপনার প্রশ্নের টপিক সিলেক্ট করুন।",
            [
                "বিকল্প জমা পদ্ধতি (bKash P2P) ব্যবহারের",
                "🎥 রেফারেল প্রোগ্রাম",
                "👑 ভিআইপি ক্লাব",
                "🎁 বোনাসগুলো",
                "💰 পেমেন্ট",
                "👤 এখন আপনি সরাসরি টেলিগ্রামে ELONBET",
                "👨‍💻 Contact Operator"
            ]
        );
    }

    // --- WITHDRAWAL FLOW ---
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

    if (textLower === 'উত্তোলন তথ্য') {
        userSessions.delete(chatId);
        return createMenuResponse(
            "উত্তোলন সম্পর্কে আপনার প্রশ্ন উল্লেখ করুন",
            "",
            [
                "কিভাবে উত্তোলন করবো?",
                "উত্তোলন করতে পারতেছি না",
                "উত্তোলন ফি",
                "সর্বনিম্ন / সর্বোচ্চ উত্তোলন এর পরিমান",
                "উত্তোলন করেছি কিন্তু টাকা এখন ও পাই নি",
                "👨‍💻 Contact Operator",
                "⬅ মেনুতে ফিরে যান"
            ]
        );
    }

    if (textLower === 'উত্তোলন করেছি কিন্তু টাকা এখন ও পাই নি') {
        userSessions.delete(chatId);
        return createMenuResponse(
            "দয়া করে আপনি যে পেমেন্ট পদ্ধতিটি ব্যবহার করেছেন তা নির্বাচন করুন। এটি আমাদেরকে আপনার উত্তোলনটি দ্রুত অনুসরণ করতে সাহায্য করে 👇",
            "",
            [
                "Bkash FAST",
                "Nagad FAST",
                "Bkash Nagad Rocket Upay"
            ]
        );
    }

    if (textLower === 'bkash fast' || textLower === 'nagad fast' || textLower === 'bkash nagad rocket upay') {
        userSessions.set(chatId, { flow: 'WITHDRAWAL', method: messageText });
        return createMenuResponse(
            "দারুন পছন্দ! এখন, আপনার আমানত সম্পর্কে আমাদের আরও কিছু তথ্যের প্রয়োজন হবে। আপনাকে লিখতে হবে:\n\n1. পরিমাণ\n2. ইউজার আইডি\n3. ওয়ালেট নম্বর\n4. উত্তোলন এর তারিখ-সময়\n\nএর পরে, আপনার ডায়ালগটি অপারেটরের কাছে স্থানান্তরিত হবে এবং তিনি নিশ্চিত করবেন যে আপনার আবেদনটি গৃহীত হয়েছে।\n\nএগিয়ে যাওয়ার জন্য প্রস্তুত?",
            "",
            [
                "হ্যাঁ, আমি প্রস্তুত",
                "আমি ইতিমধ্যে একটি অনুরোধ জমা দিয়েছি",
                "⬅ মেনুতে ফিরে যান"
            ]
        );
    }

    // Handle Active Sequence inside Withdrawal Flow
    if (session && session.flow === 'WITHDRAWAL') {
        if (textLower === 'হ্যাঁ, আমি প্রস্তুত') {
            session.step = 'ASK_AMOUNT';
            return createBotResponse("আপনার উত্তোলনের পরিমাণ কত? 💰");
        }
        
        if (session.step === 'ASK_AMOUNT') {
            session.amount = messageText;
            session.step = 'ASK_USER_ID';
            return createBotResponse("আপনার ইউজার আইডি কত? 👤");
        }

        if (session.step === 'ASK_USER_ID') {
            session.userId = messageText;
            session.step = 'ASK_WALLET';
            return createBotResponse("উত্তোলনের জন্য ব্যবহৃত ওয়ালেট নম্বরটি শেয়ার করতে পারবেন? 🏦");
        }

        if (session.step === 'ASK_WALLET') {
            session.wallet = messageText;
            session.step = 'ASK_DATE';
            return createBotResponse("আপনি এই উত্তোলনটি কখন করেছেন? তারিখ এবং সময় অনুগ্রহ করে 📅⏰");
        }

        if (session.step === 'ASK_DATE') {
            session.date = messageText;
            session.step = 'REVIEW';
            return createMenuResponse(
                `আসুন আপনি যে তথ্যগুলো দিয়েছেন তা পর্যালোচনা করি:\n\nইউজার আইডি: ${session.userId}\nপরিমান: ${session.amount}\nওয়ালেট নম্বর: ${session.wallet}\nউত্তোলনের তারিখ-সময়: ${session.date}\n\nসব কিছু ঠিক আছে?`,
                "",
                [
                    "হ্যাঁ, সব ঠিক আছে",
                    "না, কিছু একটা ভুল"
                ]
            );
        }

        if (session.step === 'REVIEW') {
            if (textLower === 'হ্যাঁ, সব ঠিক আছে') {
                userSessions.delete(chatId);
                // End of flow -> transfer to agent
                return {
                    "event": "bot_message",
                    "messages": [
                        {
                            "type": "text",
                            "text": "দারুণ! আপনাকে আরও সহায়তার জন্য একজন অপারেটরের সাথে যুক্ত করা হচ্ছে।💰"
                        }
                    ]
                };
            }
            if (textLower === 'না, কিছু একটা ভুল') {
                userSessions.delete(chatId);
                return createBotResponse("অনুগ্রহ করে পুনরায় শুরু করুন। 'পেমেন্ট' বাটনে ক্লিক করে আবার তথ্য জমা দিন।");
            }
        }
    }

    // --- END OF WITHDRAWAL FLOW ---
}

/**
 * Helper to build standard JivoChat response JSON
 */
function createBotResponse(text) {
    return {
        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]
    };
}

/**
 * Helper to build JivoChat response JSON with keyboard buttons
 */
function createMenuResponse(greeting, menuText, buttonsArray) {
    const response = {
        "messages": [
            {
                "type": "text",
                "text": greeting
            }
        ]
    };

    if (menuText) {
        response.messages.push({
            "type": "text",
            "text": menuText
        });
    }

    response.keyboard = buttonsArray.map(btnText => ({ "text": btnText }));
    return response;
}

module.exports = {
    handleMessage
};
