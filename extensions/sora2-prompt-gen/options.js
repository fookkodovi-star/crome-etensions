import { getSettings, saveSettings } from './lib/storage.js';
import { resolveModelId } from './lib/hf.js';

function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

async function init() {
  const root = document.getElementById('options');
  root.className = 'container';
  const s = await getSettings();

  root.append(el(`
    <div class="card title">
      <span class="dot"></span>
      <div>Настройки</div>
    </div>
  `));

  const tokenCard = el(`
    <div class="card">
      <div class="label">HuggingFace Token</div>
      <input id="hf" type="password" class="input" placeholder="hf_..." value="${s.hfToken || ''}" />
      <div class="status" style="margin-top:6px">Токен хранится локально в chrome.storage.sync</div>
    </div>
  `);

  const modelCard = el(`
    <div class="card">
      <div class="label">Модель</div>
      <select id="model" class="input select">
        <option value="openai/gpt-oss-120b:fireworks-ai">GPT-OSS-120B (Fireworks)</option>
        <option value="qwen3">Qwen 3</option>
        <option value="deepseek">DeepSeek</option>
        <option value="gamma">Gamma</option>
      </select>
      <div class="status" style="margin-top:6px">Текущий: ${resolveModelId(s.model)}</div>
    </div>
  `);
  modelCard.querySelector('#model').value = s.model;

  const videoCard = el(`
    <div class="card">
      <div class="label">Параметры видео по умолчанию</div>
      <div class="row">
        <select id="orientation" class="input select">
          <option value="portrait">Вертикальное</option>
          <option value="landscape">Горизонтальное</option>
          <option value="square">Квадрат</option>
        </select>
        <select id="size" class="input select">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
        <input id="frames" class="input" type="number" min="30" max="1200" step="30" value="${s.n_frames}" />
      </div>
    </div>
  `);
  videoCard.querySelector('#orientation').value = s.orientation;
  videoCard.querySelector('#size').value = s.size;

  const saveRow = el(`
    <div class="card">
      <div class="row">
        <button id="save" class="btn">Сохранить</button>
        <a class="btn secondary" href="popup.html" target="_blank">Открыть попап</a>
      </div>
    </div>
  `);

  root.append(tokenCard, modelCard, videoCard, saveRow);

  saveRow.querySelector('#save').addEventListener('click', async () => {
    const hfToken = tokenCard.querySelector('#hf').value.trim();
    const model = modelCard.querySelector('#model').value;
    const orientation = videoCard.querySelector('#orientation').value;
    const size = videoCard.querySelector('#size').value;
    const n_frames = Number(videoCard.querySelector('#frames').value) || 300;
    await saveSettings({ hfToken, model, orientation, size, n_frames });
    alert('Сохранено');
  });
}

init();
