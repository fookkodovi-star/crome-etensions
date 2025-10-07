// Глобальные переменные
let currentPrompt = '';
let isGenerating = false;

// Элементы DOM
const elements = {
    hfToken: document.getElementById('hfToken'),
    saveHfToken: document.getElementById('saveHfToken'),
    modelSelect: document.getElementById('modelSelect'),
    googleAuthBtn: document.getElementById('googleAuthBtn'),
    googleAuthStatus: document.getElementById('googleAuthStatus'),
    userDescription: document.getElementById('userDescription'),
    generateRandomBtn: document.getElementById('generateRandomBtn'),
    generateCustomBtn: document.getElementById('generateCustomBtn'),
    resultSection: document.getElementById('resultSection'),
    generatedPrompt: document.getElementById('generatedPrompt'),
    refineBtn: document.getElementById('refineBtn'),
    regenerateBtn: document.getElementById('regenerateBtn'),
    approveBtn: document.getElementById('approveBtn'),
    soraSettings: document.getElementById('soraSettings'),
    orientation: document.getElementById('orientation'),
    size: document.getElementById('size'),
    nFrames: document.getElementById('nFrames'),
    model: document.getElementById('model'),
    historyList: document.getElementById('historyList'),
    refineModal: document.getElementById('refineModal'),
    closeRefineModal: document.getElementById('closeRefineModal'),
    refinePrompt: document.getElementById('refinePrompt'),
    cancelRefine: document.getElementById('cancelRefine'),
    applyRefine: document.getElementById('applyRefine'),
    statusIndicator: document.getElementById('statusIndicator')
};

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadHistory();
    setupEventListeners();
    updateStatus('Готов к работе', 'success');
});

// Загрузка настроек
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['hfToken', 'selectedModel', 'googleAuth']);
        
        if (result.hfToken) {
            elements.hfToken.value = result.hfToken;
        }
        
        if (result.selectedModel) {
            elements.modelSelect.value = result.selectedModel;
        }
        
        if (result.googleAuth) {
            updateGoogleAuthStatus(true, result.googleAuth.email);
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
    }
}

// Сохранение настроек
async function saveSettings() {
    try {
        await chrome.storage.sync.set({
            hfToken: elements.hfToken.value,
            selectedModel: elements.modelSelect.value
        });
        updateStatus('Настройки сохранены', 'success');
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        updateStatus('Ошибка сохранения', 'error');
    }
}

// Google OAuth авторизация
async function handleGoogleAuth() {
    try {
        updateStatus('Авторизация...', 'loading');
        
        const authResult = await chrome.identity.getAuthToken({ interactive: true });
        
        if (authResult) {
            // Получаем информацию о пользователе
            const userInfo = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${authResult}`)
                .then(response => response.json());
            
            const authData = {
                token: authResult,
                email: userInfo.email,
                name: userInfo.name
            };
            
            await chrome.storage.sync.set({ googleAuth: authData });
            updateGoogleAuthStatus(true, userInfo.email);
            updateStatus('Авторизация успешна', 'success');
        }
    } catch (error) {
        console.error('Ошибка авторизации Google:', error);
        updateGoogleAuthStatus(false);
        updateStatus('Ошибка авторизации', 'error');
    }
}

// Обновление статуса Google авторизации
function updateGoogleAuthStatus(isAuthenticated, email = '') {
    if (isAuthenticated) {
        elements.googleAuthBtn.textContent = 'Выйти';
        elements.googleAuthBtn.onclick = handleGoogleLogout;
        elements.googleAuthStatus.innerHTML = `<div class="auth-status success">✅ Авторизован как ${email}</div>`;
    } else {
        elements.googleAuthBtn.textContent = 'Войти через Google';
        elements.googleAuthBtn.onclick = handleGoogleAuth;
        elements.googleAuthStatus.innerHTML = '';
    }
}

// Выход из Google
async function handleGoogleLogout() {
    try {
        const result = await chrome.storage.sync.get(['googleAuth']);
        if (result.googleAuth && result.googleAuth.token) {
            await chrome.identity.removeCachedAuthToken({ token: result.googleAuth.token });
        }
        await chrome.storage.sync.remove(['googleAuth']);
        updateGoogleAuthStatus(false);
        updateStatus('Выход выполнен', 'success');
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Генерация промта через HuggingFace API
async function generatePrompt(isRandom = false) {
    if (isGenerating) return;
    
    const hfToken = elements.hfToken.value;
    if (!hfToken) {
        updateStatus('Введите HuggingFace токен', 'error');
        return;
    }
    
    isGenerating = true;
    updateStatus('Генерация промта...', 'loading');
    
    try {
        const selectedModel = elements.modelSelect.value;
        const userDescription = elements.userDescription.value.trim();
        
        let prompt = '';
        if (isRandom) {
            prompt = await generateRandomPrompt(hfToken, selectedModel);
        } else {
            prompt = await generateCustomPrompt(hfToken, selectedModel, userDescription);
        }
        
        currentPrompt = prompt;
        elements.generatedPrompt.textContent = prompt;
        elements.resultSection.style.display = 'block';
        elements.soraSettings.style.display = 'block';
        
        updateStatus('Промт сгенерирован', 'success');
        
    } catch (error) {
        console.error('Ошибка генерации промта:', error);
        updateStatus('Ошибка генерации', 'error');
    } finally {
        isGenerating = false;
    }
}

// Генерация случайного промта
async function generateRandomPrompt(hfToken, model) {
    const randomPrompts = [
        "Создай короткий тизер-трейлер в стиле Голливуда о том, как обычный офисный работник обнаруживает, что он последний маг на Земле, и должен спасти мир от вторжения инопланетных роботов-котиков.",
        "Сгенерируй эпический боевик про повара, который готовит блюда настолько вкусные, что они оживают и помогают ему в кулинарных поединках против злых рестораторов.",
        "Создай мрачный фэнтези-фильм о библиотекаре, который обнаруживает, что книги в его библиотеке - это порталы в другие миры, и он должен остановить злого дракона, сбежавшего из детской сказки.",
        "Сгенерируй комедийный хоррор про группу друзей, которые застряли в эскалаторе торгового центра, который ведет в параллельное измерение, где все магазины управляются злыми манекенами.",
        "Создай научно-фантастический триллер о том, как последний почтальон на Земле доставляет посылку, которая содержит ключ к спасению человечества от вируса, превращающего людей в растения."
    ];
    
    const randomIndex = Math.floor(Math.random() * randomPrompts.length);
    return randomPrompts[randomIndex];
}

// Генерация промта по описанию
async function generateCustomPrompt(hfToken, model, description) {
    const systemPrompt = `Ты - эксперт по созданию креативных промтов для генерации видео. 
    Создай оригинальный, детальный и визуально впечатляющий промт для Sora 2 на основе описания пользователя.
    Промт должен быть на русском языке, содержать конкретные визуальные детали, стиль, атмосферу и сюжет.
    Сделай промт увлекательным и необычным.`;
    
    const userPrompt = description || "Создай что-то невероятно креативное и необычное";
    
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hfToken}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.9
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Доработка промта
function openRefineModal() {
    elements.refineModal.style.display = 'block';
    elements.refinePrompt.value = '';
}

function closeRefineModal() {
    elements.refineModal.style.display = 'none';
}

async function applyRefinement() {
    const refinement = elements.refinePrompt.value.trim();
    if (!refinement) return;
    
    const hfToken = elements.hfToken.value;
    if (!hfToken) {
        updateStatus('Введите HuggingFace токен', 'error');
        return;
    }
    
    isGenerating = true;
    updateStatus('Доработка промта...', 'loading');
    
    try {
        const selectedModel = elements.modelSelect.value;
        const refinedPrompt = await refinePromptWithAI(hfToken, selectedModel, currentPrompt, refinement);
        
        currentPrompt = refinedPrompt;
        elements.generatedPrompt.textContent = refinedPrompt;
        closeRefineModal();
        updateStatus('Промт доработан', 'success');
        
    } catch (error) {
        console.error('Ошибка доработки промта:', error);
        updateStatus('Ошибка доработки', 'error');
    } finally {
        isGenerating = false;
    }
}

// Доработка промта с помощью ИИ
async function refinePromptWithAI(hfToken, model, originalPrompt, refinement) {
    const systemPrompt = `Ты - эксперт по улучшению промтов для генерации видео. 
    Улучши данный промт согласно пожеланиям пользователя, сохранив его основную идею.
    Сделай промт более детальным, визуально впечатляющим и креативным.`;
    
    const userPrompt = `Оригинальный промт: "${originalPrompt}"\n\nПожелания по улучшению: "${refinement}"\n\nУлучши промт:`;
    
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${hfToken}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 500,
            temperature: 0.8
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Отправка в Sora 2
async function sendToSora() {
    const googleAuth = await chrome.storage.sync.get(['googleAuth']);
    if (!googleAuth.googleAuth) {
        updateStatus('Сначала авторизуйтесь через Google', 'error');
        return;
    }
    
    updateStatus('Отправка в Sora 2...', 'loading');
    
    try {
        const payload = {
            kind: "video",
            prompt: currentPrompt,
            title: null,
            orientation: elements.orientation.value,
            size: elements.size.value,
            n_frames: parseInt(elements.nFrames.value),
            inpaint_items: [],
            remix_target_id: null,
            cameo_ids: null,
            cameo_replacements: null,
            model: elements.model.value,
            style_id: null,
            audio_caption: null,
            audio_transcript: null,
            video_caption: null,
            storyboard_id: null
        };
        
        const response = await fetch('https://sora.chatgpt.com/backend/nf/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${googleAuth.googleAuth.token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Сохраняем в историю
        await saveToHistory(currentPrompt, result);
        
        updateStatus('Промт отправлен в Sora 2!', 'success');
        
        // Открываем Sora 2 в новой вкладке
        chrome.tabs.create({ url: 'https://sora.chatgpt.com' });
        
    } catch (error) {
        console.error('Ошибка отправки в Sora 2:', error);
        updateStatus('Ошибка отправки', 'error');
    }
}

// Сохранение в историю
async function saveToHistory(prompt, result) {
    try {
        const historyItem = {
            id: Date.now(),
            prompt: prompt,
            result: result,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('ru-RU')
        };
        
        const existingHistory = await chrome.storage.local.get(['promptHistory']);
        const history = existingHistory.promptHistory || [];
        
        history.unshift(historyItem);
        
        // Ограничиваем историю 50 элементами
        if (history.length > 50) {
            history.splice(50);
        }
        
        await chrome.storage.local.set({ promptHistory: history });
        await loadHistory();
        
    } catch (error) {
        console.error('Ошибка сохранения в историю:', error);
    }
}

// Загрузка истории
async function loadHistory() {
    try {
        const result = await chrome.storage.local.get(['promptHistory']);
        const history = result.promptHistory || [];
        
        if (history.length === 0) {
            elements.historyList.innerHTML = '<div class="empty-state">История пуста</div>';
            return;
        }
        
        elements.historyList.innerHTML = history.map(item => `
            <div class="history-item" onclick="loadPromptFromHistory('${item.id}')">
                <div class="prompt-preview">${item.prompt.substring(0, 100)}${item.prompt.length > 100 ? '...' : ''}</div>
                <div class="prompt-date">${item.date}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

// Загрузка промта из истории
function loadPromptFromHistory(id) {
    chrome.storage.local.get(['promptHistory'], (result) => {
        const history = result.promptHistory || [];
        const item = history.find(h => h.id == id);
        
        if (item) {
            currentPrompt = item.prompt;
            elements.generatedPrompt.textContent = item.prompt;
            elements.resultSection.style.display = 'block';
            elements.soraSettings.style.display = 'block';
            updateStatus('Промт загружен из истории', 'success');
        }
    });
}

// Обновление статуса
function updateStatus(message, type = 'info') {
    const statusText = elements.statusIndicator.querySelector('.status-text');
    const statusDot = elements.statusIndicator.querySelector('.status-dot');
    
    statusText.textContent = message;
    
    // Убираем все классы статуса
    statusDot.className = 'status-dot';
    
    switch (type) {
        case 'success':
            statusDot.style.background = '#4CAF50';
            break;
        case 'error':
            statusDot.style.background = '#f44336';
            break;
        case 'loading':
            statusDot.style.background = '#ff9800';
            break;
        default:
            statusDot.style.background = '#4CAF50';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Сохранение HF токена
    elements.saveHfToken.addEventListener('click', saveSettings);
    
    // Google авторизация
    elements.googleAuthBtn.addEventListener('click', handleGoogleAuth);
    
    // Генерация промтов
    elements.generateRandomBtn.addEventListener('click', () => generatePrompt(true));
    elements.generateCustomBtn.addEventListener('click', () => generatePrompt(false));
    
    // Доработка промта
    elements.refineBtn.addEventListener('click', openRefineModal);
    elements.regenerateBtn.addEventListener('click', () => generatePrompt(elements.userDescription.value.trim() === ''));
    
    // Отправка в Sora 2
    elements.approveBtn.addEventListener('click', sendToSora);
    
    // Модальное окно
    elements.closeRefineModal.addEventListener('click', closeRefineModal);
    elements.cancelRefine.addEventListener('click', closeRefineModal);
    elements.applyRefine.addEventListener('click', applyRefinement);
    
    // Закрытие модального окна по клику вне его
    elements.refineModal.addEventListener('click', (e) => {
        if (e.target === elements.refineModal) {
            closeRefineModal();
        }
    });
    
    // Сохранение модели при изменении
    elements.modelSelect.addEventListener('change', saveSettings);
}