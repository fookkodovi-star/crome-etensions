import { getSettings } from './storage.js';

const SORA_BASE = 'https://sora.chatgpt.com';

export async function ensureSoraLogin() {
  // Check session by calling a lightweight endpoint; if unauthorized, open login
  const me = await fetch(`${SORA_BASE}/backend/nf/me`, { credentials: 'include' }).catch(() => ({ status: 0 }));
  if (me && me.status === 200) return true;
  await chrome.tabs.create({ url: `${SORA_BASE}/login` });
  throw new Error('Требуется вход в Sora 2 (Google). После входа вернитесь и повторите отправку.');
}

export async function submitToSora(payload) {
  const res = await fetch(`${SORA_BASE}/backend/nf/create`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sora create failed: ${res.status} ${txt}`);
  }
  return await res.json().catch(() => ({}));
}

export function buildSoraPayload({ prompt, orientation, size, n_frames, model_id }) {
  return {
    kind: 'video',
    prompt,
    title: null,
    orientation,
    size,
    n_frames,
    inpaint_items: [],
    remix_target_id: null,
    cameo_ids: null,
    cameo_replacements: null,
    model: model_id,
    style_id: null,
    audio_caption: null,
    audio_transcript: null,
    video_caption: null,
    storyboard_id: null
  };
}
