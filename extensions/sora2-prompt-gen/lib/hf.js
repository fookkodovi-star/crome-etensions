const HF_BASE = 'https://router.huggingface.co/v1';

// Pragmatic aliases; user can override with full IDs in settings
const MODEL_ALIASES = {
  qwen3: 'Qwen/Qwen2.5-7B-Instruct',
  deepseek: 'deepseek-ai/DeepSeek-V3',
  gptoss: 'openai/gpt-oss-120b:fireworks-ai',
  gamma: 'google/gemma-2-9b-it'
};

export function resolveModelId(modelKeyOrId) {
  if (!modelKeyOrId) return MODEL_ALIASES.gptoss;
  return MODEL_ALIASES[modelKeyOrId] || modelKeyOrId;
}

async function hfChatCompletions({ model, messages, temperature, max_tokens, hfToken }) {
  const resp = await fetch(`${HF_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${hfToken}`
    },
    body: JSON.stringify({ model, messages, temperature, max_tokens })
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`HF error ${resp.status}: ${txt}`);
  }
  return await resp.json();
}

export async function generatePrompt({ mode, description, model, hfToken }) {
  if (!hfToken) throw new Error('HuggingFace токен не задан. Задайте его в настройках.');

  const modelId = resolveModelId(model);
  const system = `You are a creative prompt engineer for Sora 2. Produce vivid, diverse, feasible short-video prompts. Output ONLY the prompt text. Avoid explanations.`;
  const user = mode === 'random'
    ? 'Create an unexpected, cinematic, original short-video prompt for Sora 2. Include style, setting, action, twist, tone, and camera hints.'
    : `Create a Sora 2 short-video prompt based on: "${description}". Add tone, style, visual motifs, and camera directions. Output only the prompt.`;

  const chat = await hfChatCompletions({
    model: modelId,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.9,
    max_tokens: 350,
    hfToken
  });

  const content = chat.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Не удалось получить текст промта от модели.');
  return content;
}

export async function chatCritique(prompt, { model, hfToken }) {
  if (!hfToken) throw new Error('HuggingFace токен не задан.');
  const modelId = resolveModelId(model);
  const chat = await hfChatCompletions({
    model: modelId,
    messages: [
      { role: 'system', content: 'Act as a strict Sora 2 prompt reviewer. Critique briefly (bullets), then suggest a refined prompt. Keep it concise.' },
      { role: 'user', content: `Prompt to review:\n\n${prompt}` }
    ],
    temperature: 0.6,
    max_tokens: 300,
    hfToken
  });
  return chat.choices?.[0]?.message?.content?.trim() || '';
}
