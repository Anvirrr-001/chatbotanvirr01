let currentConfig = null;
let adminPassword = '';

async function login() {
    const pass = document.getElementById('admin-pass').value;
    if (!pass) return;

    try {
        const loginRes = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass })
        });

        if (loginRes.ok) {
            const configRes = await fetch('/api/config');
            if (configRes.ok) {
                currentConfig = await configRes.json();
                adminPassword = pass;
                
                // Show dashboard
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('hidden');
                
                renderDashboard();
            }
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    } catch (e) {
        alert("Server error connecting to API");
    }
}

function renderDashboard() {
    if (!currentConfig) return;

    document.getElementById('bot-name').value = currentConfig.botName || "";
    document.getElementById('welcome-greeting').value = currentConfig.welcomeGreeting || "";
    document.getElementById('menu-text').value = currentConfig.welcomeMenuText || "";

    // Render Welcome Menu Buttons
    const menuList = document.getElementById('menu-buttons-list');
    menuList.innerHTML = '';
    (currentConfig.welcomeMenu || []).forEach((btn, idx) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-800 p-2 px-3 rounded text-sm";
        div.innerHTML = `
            <span>${btn}</span>
            <button onclick="removeButton(${idx})" class="text-gray-500 hover:text-red-500"><i class="fas fa-times"></i></button>
        `;
        menuList.appendChild(div);
    });

    // Render Keywords
    const kwContainer = document.getElementById('keywords-container');
    kwContainer.innerHTML = '';
    (currentConfig.keywords || []).forEach((kw, idx) => {
        addKeywordCard(kw, idx);
    });
}

function addButton() {
    const txt = document.getElementById('new-button-text').value.trim();
    if (!txt) return;
    if (!currentConfig.welcomeMenu) currentConfig.welcomeMenu = [];
    currentConfig.welcomeMenu.push(txt);
    document.getElementById('new-button-text').value = '';
    renderDashboard();
}

function removeButton(idx) {
    currentConfig.welcomeMenu.splice(idx, 1);
    renderDashboard();
}

function addKeywordCard(kw = {}, idx = null) {
    const template = document.getElementById('keyword-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('div');

    if (kw.trigger) card.querySelector('.kw-trigger').value = kw.trigger;
    if (kw.exactMatch !== undefined) card.querySelector('.kw-match').value = String(kw.exactMatch);
    if (kw.responseType) {
        card.querySelector('.kw-type').value = kw.responseType;
        if (kw.responseType === 'menu') card.querySelector('.options-container').classList.remove('hidden');
    }
    if (kw.text) card.querySelector('.kw-text').value = kw.text;
    if (kw.options) card.querySelector('.kw-options').value = kw.options.join(', ');

    card.querySelector('.remove-kw-btn').onclick = () => {
        card.remove();
    };

    document.getElementById('keywords-container').prepend(card);
}

function addNewKeyword() {
    addKeywordCard({ trigger: '', responseType: 'text', exactMatch: false });
}

function updateKwUI(select) {
    const container = select.closest('.glass').querySelector('.options-container');
    if (select.value === 'menu') container.classList.remove('hidden');
    else container.classList.add('hidden');
}

async function saveConfig() {
    // Collect data from UI back into a config object
    const newConfig = {
        botName: document.getElementById('bot-name').value,
        welcomeGreeting: document.getElementById('welcome-greeting').value,
        welcomeMenuText: document.getElementById('menu-text').value,
        welcomeMenu: currentConfig.welcomeMenu, // Already synced via add/remove functions
        keywords: []
    };

    const kwCards = document.querySelectorAll('#keywords-container > div');
    kwCards.forEach(card => {
        const trigger = card.querySelector('.kw-trigger').value.trim();
        if (!trigger) return;

        const kw = {
            trigger: trigger,
            exactMatch: card.querySelector('.kw-match').value === 'true',
            responseType: card.querySelector('.kw-type').value,
            text: card.querySelector('.kw-text').value
        };

        if (kw.responseType === 'menu') {
            const opts = card.querySelector('.kw-options').value;
            kw.options = opts.split(',').map(s => s.trim()).filter(s => s);
        }

        newConfig.keywords.push(kw);
    });

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: adminPassword,
                config: newConfig
            })
        });

        const result = await response.json();
        if (response.ok) {
            alert("Success! Configuration updated and saved to server.");
            currentConfig = newConfig;
        } else {
            alert("Error: " + result.error);
        }
    } catch (e) {
        alert("Failed to connect to server.");
    }
}

function logout() {
    location.reload();
}
