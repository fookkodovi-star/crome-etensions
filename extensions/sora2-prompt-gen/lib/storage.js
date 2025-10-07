const DEFAULTS = {
  hfToken: '',
  model: 'openai/gpt-oss-120b:fireworks-ai',
  orientation: 'portrait',
  size: 'small',
  n_frames: 300,
  model_id: 'sy_8'
};

export async function getSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...data };
}

export async function saveSettings(partial) {
  await chrome.storage.sync.set(partial);
}
