import { buildSoraPayload } from './lib/sora.js';
import { getSettings } from './lib/storage.js';

function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

async function send(type, payload) {
  return await chrome.runtime.sendMessage({ type, ...payload });
}

function ratingBadge(score) {
  const color = score >= 8 ? 'success' : score >= 6 ? '' : 'error';
  return `<span class="badge ${color}">Оценка: ${score}/10</span>`;
}

function footer(status = '') {
  return `<div class="footer"><span class="status">${status}</span><a href="options.html" target="_blank">Настройки</a></div>`;
}

function render() {
  const app = document.getElementById('app');
  app.className = 'container';
  app.innerHTML = '';

  const header = el(`
    <div class="card title">
      <span class="dot"></span>
      <div>Sora 2 Prompt Wizard</div>
    </div>
  `);

  const inputCard = el(`
    <div class="card">
      <div class="label">Описание (необязательно)</div>
      <textarea id="desc" class="input textarea" placeholder="Например: мрачный киберпанк в стиле нуар, исследование заброшенного мегаполиса..."></textarea>
      <div class="row" style="margin-top:10px">
        <button id="btn-rand" class="btn">Случайный</button>
        <button id="btn-by" class="btn secondary">По описанию</button>
      </div>
    </div>
  `);

  const outCard = el(`
    <div class="card" id="out-card" style="display:none">
      <div class="label">Промт</div>
      <textarea id="out" class="input textarea"></textarea>
      <div class="row" style="margin-top:10px">
        <button id="btn-rate-ai" class="btn secondary">AI-критика</button>
        <button id="btn-submit" class="btn">Отправить в Sora 2</button>
      </div>
      <div id="rating" class="rating" style="margin-top:10px"></div>
    </div>
  `);

  const controls = el(`
    <div class="card" id="controls" style="display:none">
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
        <input id="frames" class="input" type="number" min="30" max="1200" step="30" value="300" />
      </div>
      <div class="row" style="margin-top:8px">
        <input id="sora-model" class="input grow" placeholder="Sora model id (напр., sy_8)" />
      </div>
    </div>
  `);

  const foot = el(`<div>${footer('Готово')}</div>`);

  app.append(header, inputCard, outCard, controls, foot);

  const desc = inputCard.querySelector('#desc');
  const btnRand = inputCard.querySelector('#btn-rand');
  const btnBy = inputCard.querySelector('#btn-by');
  const out = outCard.querySelector('#out');
  const rating = outCard.querySelector('#rating');
  const btnRateAI = outCard.querySelector('#btn-rate-ai');
  const btnSubmit = outCard.querySelector('#btn-submit');
  const orientation = controls.querySelector('#orientation');
  const size = controls.querySelector('#size');
  const frames = controls.querySelector('#frames');
  const soraModel = controls.querySelector('#sora-model');

  // Prefill from saved defaults
  (async () => {
    const s = await getSettings();
    orientation.value = s.orientation;
    size.value = s.size;
    frames.value = s.n_frames || 300;
    soraModel.value = s.model_id || 'sy_8';
  })();

  async function doGenerate(mode) {
    rating.innerHTML = '';
    const res = await send('generate', { mode, description: desc.value });
    if (!res.ok) {
      rating.innerHTML = `<span class="error">${res.error}</span>`;
      outCard.style.display = 'block';
      controls.style.display = 'block';
      return;
    }
    out.value = res.prompt;
    outCard.style.display = 'block';
    controls.style.display = 'block';
    const { score, tips } = res.rating;
    rating.innerHTML = ratingBadge(score) + (tips.length ? ` <span class="status">${tips.join(' ')}</span>` : '');
  }

  btnRand.addEventListener('click', () => doGenerate('random'));
  btnBy.addEventListener('click', () => doGenerate('byDescription'));

  btnRateAI.addEventListener('click', async () => {
    const res = await send('rateAI', { prompt: out.value });
    if (!res.ok) {
      rating.innerHTML = `<span class="error">${res.error}</span>`;
    } else {
      rating.innerHTML = `<div class="badge">AI</div> <span class="status">${res.critique.replace(/\n/g, ' ')}</span>`;
    }
  });

  btnSubmit.addEventListener('click', async () => {
    const s = await getSettings();
    const payload = buildSoraPayload({
      prompt: out.value,
      orientation: orientation.value || s.orientation,
      size: size.value || s.size,
      n_frames: Number(frames.value) || s.n_frames || 300,
      model_id: (soraModel.value || s.model_id || 'sy_8')
    });
    const res = await send('submitToSora', { payload });
    if (!res.ok) {
      rating.innerHTML = `<span class="error">${res.error}</span>`;
    } else {
      rating.innerHTML = `<span class="success">Отправлено! Заявка создана.</span>`;
    }
  });
}

render();
