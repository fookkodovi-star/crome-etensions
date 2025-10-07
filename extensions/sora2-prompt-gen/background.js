import { getSettings } from './lib/storage.js';
import { generatePrompt } from './lib/hf.js';
import { ratePromptLocal, ratePromptAI } from './lib/rating.js';
import { submitToSora, ensureSoraLogin } from './lib/sora.js';

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    try {
      if (req.type === 'generate') {
        const settings = await getSettings();
        const prompt = await generatePrompt({
          mode: req.mode, // 'random' | 'byDescription'
          description: req.description || '',
          model: settings.model,
          hfToken: settings.hfToken,
        });
        const rating = await ratePromptLocal(prompt);
        sendResponse({ ok: true, prompt, rating });
      } else if (req.type === 'rateAI') {
        const settings = await getSettings();
        const critique = await ratePromptAI(req.prompt, settings);
        sendResponse({ ok: true, critique });
      } else if (req.type === 'submitToSora') {
        await ensureSoraLogin();
        const result = await submitToSora(req.payload);
        sendResponse({ ok: true, result });
      } else if (req.type === 'getSettings') {
        const settings = await getSettings();
        sendResponse({ ok: true, settings });
      } else {
        sendResponse({ ok: false, error: 'Unknown request type' });
      }
    } catch (error) {
      sendResponse({ ok: false, error: String(error && error.message ? error.message : error) });
    }
  })();
  return true;
});
