const ADJECTIVES = ['soft', 'warm', 'quiet', 'still', 'bright', 'gentle', 'wild', 'slow', 'honey', 'calm'];
const NOUNS = ['petal', 'moss', 'fern', 'dawn', 'dusk', 'meadow', 'sprout', 'garden', 'willow', 'clover'];

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const rand = Math.random().toString(36).slice(2, 6);
  return `bloom-${adj}-${noun}-${rand}`;
}