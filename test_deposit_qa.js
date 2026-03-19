const { handleMessage } = require('./botLogic.js');

async function runTest() {
    const clientId = 999;
    const chatId = 888;

    console.log("--- STARTING DEPOSIT FLOW TEST ---");

    // 1. Initial Start
    let res = await handleMessage('/start', clientId, chatId);
    console.log("Bot Response (Start):", res.messages[1].text);

    // 2. Click "💰 পেমেন্ট"
    res = await handleMessage('💰 পেমেন্ট', clientId, chatId);
    console.log("\nBot Response (Payment):", res.messages[0].text);

    // 3. Click "ডিপোজিট জমা হয় নি"
    res = await handleMessage('ডিপোজিট জমা হয় নি', clientId, chatId);
    console.log("\nBot Response (Methods):", res.messages[0].text);
    console.log("Buttons:", res.keyboard.map(k => k.text).join(" | "));

    // 4. Click "Bkash FAST"
    res = await handleMessage('Bkash FAST', clientId, chatId);
    console.log("\nBot Response (Intro):", res.messages[0].text.substring(0, 50) + "...");

    // 5. Click "হ্যাঁ, আমি প্রস্তুত"
    res = await handleMessage('হ্যাঁ, আমি প্রস্তুত', clientId, chatId);
    console.log("\nStep 1 (Amount):", res.messages[0].text);

    // 6. Answer: 500
    res = await handleMessage('500', clientId, chatId);
    console.log("\nStep 2 (User ID):", res.messages[0].text);

    // 7. Answer: ID555
    res = await handleMessage('ID555', clientId, chatId);
    console.log("\nStep 3 (Txn ID):", res.messages[0].text);

    // 8. Answer: TXN999
    res = await handleMessage('TXN999', clientId, chatId);
    console.log("\nStep 4 (Wallet):", res.messages[0].text);

    // 9. Answer: 01800000000
    res = await handleMessage('01800000000', clientId, chatId);
    console.log("\nStep 5 (Time):", res.messages[0].text);

    // 10. Answer: 10 mins ago
    res = await handleMessage('10 mins ago', clientId, chatId);
    console.log("\nSummary:\n", res.messages[0].text);
    console.log("Buttons:", res.keyboard.map(k => k.text).join(" | "));

    // 11. Confirm
    res = await handleMessage('হ্যাঁ, সব ঠিক আছে', clientId, chatId);
    console.log("\nFinal:", res.messages[0].text);

    console.log("\n--- TEST COMPLETE ---");
}

runTest();
