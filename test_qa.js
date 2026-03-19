const { handleMessage } = require('./botLogic.js');

async function runTest() {
    const clientId = 1234;
    const chatId = 5678;

    console.log("--- STARTING WITHDRAWAL FLOW TEST ---");

    // 1. Initial Start
    let res = await handleMessage('/start', clientId, chatId);
    console.log("Bot Response (Start):", res.messages[1].text);
    console.log("Buttons:", res.keyboard.map(k => k.text).join(" | "));

    // 2. Click "💰 পেমেন্ট"
    res = await handleMessage('💰 পেমেন্ট', clientId, chatId);
    console.log("\nBot Response (Payment):", res.messages[0].text);
    console.log("Buttons:", res.keyboard.map(k => k.text).join(" | "));

    // 3. Click "উত্তোলন তথ্য"
    res = await handleMessage('উত্তোলন তথ্য', clientId, chatId);
    console.log("\nBot Response (Withdraw Info):", res.messages[0].text);

    // 4. Click "উত্তোলন করেছি কিন্তু টাকা এখন ও পাই নি"
    res = await handleMessage('উত্তোলন করেছি কিন্তু টাকা এখন ও পাই নি', clientId, chatId);
    console.log("\nBot Response (Methods):", res.messages[0].text);

    // 5. Click "Bkash FAST"
    res = await handleMessage('Bkash FAST', clientId, chatId);
    console.log("\nBot Response (Intro):", res.messages[0].text);
    console.log("Buttons:", res.keyboard.map(k => k.text).join(" | "));

    // 6. Click "হ্যাঁ, আমি প্রস্তুত" (Starts Q&A)
    res = await handleMessage('হ্যাঁ, আমি প্রস্তুত', clientId, chatId);
    console.log("\nBot Question 1:", res.messages[0].text);

    // 7. Answer: 1000
    res = await handleMessage('1000', clientId, chatId);
    console.log("\nBot Question 2:", res.messages[0].text);

    // 8. Answer: ID123
    res = await handleMessage('ID123', clientId, chatId);
    console.log("\nBot Question 3:", res.messages[0].text);

    // 9. Answer: 01700000000
    res = await handleMessage('01700000000', clientId, chatId);
    console.log("\nBot Question 4:", res.messages[0].text);

    // 10. Answer: Just now
    res = await handleMessage('Just now', clientId, chatId);
    console.log("\nBot Summary:\n", res.messages[0].text);
    console.log("Buttons:", res.keyboard.map(k => k.text).join(" | "));

    // 11. Confirm: হ্যাঁ, সব ঠিক আছে
    res = await handleMessage('হ্যাঁ, সব ঠিক আছে', clientId, chatId);
    console.log("\nFinal Response (Transfer):", res.messages[0].text);
    console.log("Event:", res.event);

    console.log("\n--- TEST COMPLETE ---");
}

runTest();
