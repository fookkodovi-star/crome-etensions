import { getSettings } from './storage.js';

const SORA_BASE = 'https://sora.chatgpt.com';

export async function ensureSoraLogin() {
  // Try to access drafts; if redirected or forbidden, ask user to sign in
  const resp = await fetch(`${SORA_BASE}/drafts`, { credentials: 'include' }).catch(() => null);
  if (resp && resp.ok && resp.url && resp.url.includes('/drafts')) {
    return true;
  }
  await chrome.tabs.create({ url: `${SORA_BASE}/drafts` });
  throw new Error('Нужно войти в Sora 2 (Google). Открыл страницу /drafts — войдите и повторите отправку.');
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
