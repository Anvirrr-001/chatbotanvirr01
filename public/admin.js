let currentConfig = { menus: [], initialMenuId: "main_menu", botName: "", welcomeGreeting: "" };
let adminPassword = '';
let activeMenuId = null;

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
    document.getElementById('bot-name').value = currentConfig.botName || "";
    document.getElementById('welcome-greeting').value = currentConfig.welcomeGreeting || "";
    renderSidebar();
    
    if (activeMenuId) openMenu(activeMenuId);
}

function renderSidebar() {
    const sidebar = document.getElementById('menu-list-sidebar');
    sidebar.innerHTML = '';
    
    currentConfig.menus.forEach(menu => {
        const isInitial = menu.id === currentConfig.initialMenuId;
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-3 rounded-lg text-sm transition-all flex justify-between items-center ${activeMenuId === menu.id ? 'bg-blue-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`;
        btn.onclick = () => openMenu(menu.id);
        
        btn.innerHTML = `
            <span>${menu.id}</span>
            ${isInitial ? '<span class="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">START</span>' : ''}
        `;
        sidebar.appendChild(btn);
    });
}

function openMenu(id) {
    activeMenuId = id;
    const menu = currentConfig.menus.find(m => m.id === id);
    if (!menu) return;

    document.getElementById('no-menu-selected').classList.add('hidden');
    document.getElementById('menu-editor').classList.remove('hidden');
    
    renderSidebar(); // Update highlighting

    document.getElementById('editing-menu-id').textContent = menu.id;
    document.getElementById('menu-type').value = menu.type || 'standard';
    document.getElementById('menu-text-content').value = menu.text || '';
    document.getElementById('is-initial-menu').checked = (id === currentConfig.initialMenuId);
    
    toggleMenuTypeUI();
    renderOptions(menu.options || []);
}

function toggleMenuTypeUI() {
    const type = document.getElementById('menu-type').value;
    const optionsSection = document.getElementById('options-section');
    if (type === 'operator') {
        optionsSection.classList.add('hidden');
    } else {
        optionsSection.classList.remove('hidden');
    }
}

function renderOptions(options) {
    const list = document.getElementById('options-list');
    list.innerHTML = '';
    
    options.forEach(opt => addOptionRow(opt));
}

function addOptionRow(opt = { text: '', target: '' }) {
    const template = document.getElementById('option-row-template');
    const clone = template.content.cloneNode(true);
    const row = clone.querySelector('div');
    
    row.querySelector('.opt-text').value = opt.text;
    
    const select = row.querySelector('.opt-target');
    // Populate select with all available menu IDs
    currentConfig.menus.forEach(m => {
        const option = document.createElement('option');
        option.value = m.id;
        option.textContent = m.id;
        if (m.id === opt.target) option.selected = true;
        select.appendChild(option);
    });

    row.querySelector('.remove-option-btn').onclick = () => row.remove();
    document.getElementById('options-list').appendChild(row);
}

function createNewMenu() {
    document.getElementById('new-menu-modal').classList.add('show');
    document.getElementById('new-menu-id-input').value = '';
    document.getElementById('new-menu-id-input').focus();
}

function closeModal() {
    document.getElementById('new-menu-modal').classList.remove('show');
}

function confirmCreateMenu() {
    const id = document.getElementById('new-menu-id-input').value.trim();
    if (!id) return;
    if (currentConfig.menus.find(m => m.id === id)) return alert("ID already exists!");

    const newMenu = { id: id, text: "New step text...", options: [], type: 'standard' };
    currentConfig.menus.push(newMenu);
    closeModal();
    openMenu(id);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function deleteActiveMenu() {
    if (!activeMenuId) return;
    if (activeMenuId === currentConfig.initialMenuId) return alert("Cannot delete the entry point menu!");
    if (!confirm(`Are you sure you want to delete menu '${activeMenuId}'?`)) return;

    currentConfig.menus = currentConfig.menus.filter(m => m.id !== activeMenuId);
    activeMenuId = null;
    document.getElementById('menu-editor').classList.add('hidden');
    document.getElementById('no-menu-selected').classList.remove('hidden');
    renderSidebar();
}

async function saveConfig() {
    // 1. Update Global Settings
    currentConfig.botName = document.getElementById('bot-name').value;
    currentConfig.welcomeGreeting = document.getElementById('welcome-greeting').value;

    // 2. Sync the currently open menu from its form fields
    if (activeMenuId) {
        const menu = currentConfig.menus.find(m => m.id === activeMenuId);
        if (menu) {
            menu.type = document.getElementById('menu-type').value;
            menu.text = document.getElementById('menu-text-content').value;
            
            if (document.getElementById('is-initial-menu').checked) {
                currentConfig.initialMenuId = activeMenuId;
            }

            if (menu.type === 'standard') {
                const optionRows = document.querySelectorAll('#options-list > div');
                menu.options = Array.from(optionRows).map(row => ({
                    text: row.querySelector('.opt-text').value,
                    target: row.querySelector('.opt-target').value
                })).filter(o => o.text);
            } else {
                menu.options = [];
            }
        }
    }

    // 3. Save to server
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: adminPassword,
                config: currentConfig
            })
        });

        if (response.ok) {
            showToast("Changes saved and live! ✅");
            renderSidebar();
        } else {
            const err = await response.json();
            alert("Error: " + err.error);
        }
    } catch (e) {
        alert("Failed to save. Check connection.");
    }
}

function logout() { location.reload(); }

