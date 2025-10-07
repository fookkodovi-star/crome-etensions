// Background script для Chrome расширения Sora 2 Prompt Generator

// Обработка установки расширения
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Sora 2 Prompt Generator установлен');
        
        // Инициализация настроек по умолчанию
        chrome.storage.sync.set({
            selectedModel: 'openai/gpt-oss-120b:fireworks-ai',
            hfToken: '',
            googleAuth: null
        });
        
        // Открываем страницу приветствия
        chrome.tabs.create({
            url: chrome.runtime.getURL('welcome.html')
        });
    }
});

// Обработка обновления расширения
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'update') {
        console.log('Sora 2 Prompt Generator обновлен');
    }
});

// Обработка сообщений от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'generatePrompt':
            handlePromptGeneration(request, sendResponse);
            return true; // Асинхронный ответ
            
        case 'sendToSora':
            handleSoraSubmission(request, sendResponse);
            return true;
            
        case 'getAuthStatus':
            handleGetAuthStatus(sendResponse);
            return true;
            
        case 'clearHistory':
            handleClearHistory(sendResponse);
            return true;
            
        default:
            sendResponse({ success: false, error: 'Неизвестное действие' });
    }
});

// Генерация промта через HuggingFace API
async function handlePromptGeneration(request, sendResponse) {
    try {
        const { hfToken, model, description, isRandom } = request;
        
        if (!hfToken) {
            sendResponse({ success: false, error: 'HuggingFace токен не найден' });
            return;
        }
        
        let prompt;
        
        if (isRandom) {
            // Генерируем случайный промт
            prompt = generateRandomPrompt();
        } else {
            // Генерируем промт по описанию через API
            prompt = await generateCustomPrompt(hfToken, model, description);
        }
        
        sendResponse({ success: true, prompt: prompt });
        
    } catch (error) {
        console.error('Ошибка генерации промта:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Генерация случайного промта
function generateRandomPrompt() {
    const randomPrompts = [
        "Создай короткий тизер-трейлер в стиле Голливуда о том, как обычный офисный работник обнаруживает, что он последний маг на Земле, и должен спасти мир от вторжения инопланетных роботов-котиков.",
        "Сгенерируй эпический боевик про повара, который готовит блюда настолько вкусные, что они оживают и помогают ему в кулинарных поединках против злых рестораторов.",
        "Создай мрачный фэнтези-фильм о библиотекаре, который обнаруживает, что книги в его библиотеке - это порталы в другие миры, и он должен остановить злого дракона, сбежавшего из детской сказки.",
        "Сгенерируй комедийный хоррор про группу друзей, которые застряли в эскалаторе торгового центра, который ведет в параллельное измерение, где все магазины управляются злыми манекенами.",
        "Создай научно-фантастический триллер о том, как последний почтальон на Земле доставляет посылку, которая содержит ключ к спасению человечества от вируса, превращающего людей в растения.",
        "Сгенерируй романтическую комедию о двух роботах, которые влюбляются друг в друга, но их создатели пытаются их разлучить, потому что они запрограммированы на разные задачи.",
        "Создай детективный триллер о следователе, который расследует убийства, совершенные призраками, и обнаруживает, что он сам может быть следующим жертвой.",
        "Сгенерируй приключенческий фильм о группе детей, которые находят портал в мир, где все их игрушки ожили и ведут войну против злых взрослых.",
        "Создай драму о стареющем супергерое, который должен передать свои силы молодому преемнику, но оказывается, что преемник - его собственный сын, который не хочет быть героем.",
        "Сгенерируй мюзикл о том, как все жители города внезапно начинают говорить только в стихах, и только один человек может их спасти, научившись петь."
    ];
    
    const randomIndex = Math.floor(Math.random() * randomPrompts.length);
    return randomPrompts[randomIndex];
}

// Генерация промта по описанию через API
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

// Отправка в Sora 2
async function handleSoraSubmission(request, sendResponse) {
    try {
        const { prompt, settings, googleAuth } = request;
        
        if (!googleAuth || !googleAuth.token) {
            sendResponse({ success: false, error: 'Google авторизация не найдена' });
            return;
        }
        
        const payload = {
            kind: "video",
            prompt: prompt,
            title: null,
            orientation: settings.orientation || "portrait",
            size: settings.size || "small",
            n_frames: settings.nFrames || 300,
            inpaint_items: [],
            remix_target_id: null,
            cameo_ids: null,
            cameo_replacements: null,
            model: settings.model || "sy_8",
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
                'Authorization': `Bearer ${googleAuth.token}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        sendResponse({ success: true, result: result });
        
    } catch (error) {
        console.error('Ошибка отправки в Sora 2:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Получение статуса авторизации
async function handleGetAuthStatus(sendResponse) {
    try {
        const result = await chrome.storage.sync.get(['googleAuth', 'hfToken']);
        sendResponse({ 
            success: true, 
            googleAuth: result.googleAuth,
            hfToken: result.hfToken
        });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

// Очистка истории
async function handleClearHistory(sendResponse) {
    try {
        await chrome.storage.local.remove(['promptHistory']);
        sendResponse({ success: true });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

// Обработка ошибок
chrome.runtime.onStartup.addListener(() => {
    console.log('Sora 2 Prompt Generator запущен');
});

// Обработка обновления расширения
chrome.runtime.onUpdateAvailable.addListener((details) => {
    console.log('Доступно обновление:', details.version);
});

// Обработка ошибок расширения
chrome.runtime.onSuspend.addListener(() => {
    console.log('Sora 2 Prompt Generator приостановлен');
});

// Уведомления
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'sora-success') {
        chrome.tabs.create({ url: 'https://sora.chatgpt.com' });
    }
});

// Создание уведомления
function createNotification(title, message, type = 'basic') {
    chrome.notifications.create({
        type: type,
        iconUrl: 'icon48.png',
        title: title,
        message: message
    });
}

// Экспорт функций для использования в popup
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateRandomPrompt,
        generateCustomPrompt,
        createNotification
    };
}