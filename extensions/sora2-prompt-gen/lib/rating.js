export async function ratePromptLocal(prompt) {
  const indicators = [
    /style|cinematic|dramatic|surreal|noir|retro|vintage|futuristic/i,
    /camera|shot|wide|close-up|tracking|handheld|dolly|steady|fps|lens/i,
    /setting|location|city|forest|space|ocean|desert|neon|dystopia/i,
    /action|twist|reveal|montage|transition|cut|fade|slow motion/i,
    /tone|mood|atmosphere|whimsical|dark|melancholic|playful|epic/i,
  ];

  let score = 0;
  for (const re of indicators) if (re.test(prompt)) score += 1;
  const lengthBonus = Math.min(3, Math.floor(prompt.split(/\s+/).length / 25));
  score += lengthBonus;
  score = Math.min(10, Math.max(1, score + 2));

  const tips = [];
  if (!/camera|shot|lens|fps/i.test(prompt)) tips.push('Добавьте указания камеры (ракурсы, движение, объектив).');
  if (!/tone|mood|atmosphere/i.test(prompt)) tips.push('Уточните тон/настроение.');
  if (!/style|cinematic|aesthetic/i.test(prompt)) tips.push('Опишите визуальный стиль.');
  if (!/twist|reveal|surprise|hook/i.test(prompt)) tips.push('Добавьте твист или крючок.');

  return { score, tips };
}

import { chatCritique } from './hf.js';

export async function ratePromptAI(prompt, settings) {
  return await chatCritique(prompt, { model: settings.model, hfToken: settings.hfToken });
}
