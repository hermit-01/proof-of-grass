// The quests, the decoys, and today's three quests (the same for everyone on a given IST date).

export const QUESTS = ['tree', 'sky', 'flower', 'grass', 'bird', 'dog', 'cat', 'water'];
// Findable anywhere: every day starts with one of these.
export const ANYWHERE = ['tree', 'sky', 'grass'];
// Scored by the model but never quests: they soak up photos of roads, buildings and people (selfies).
export const DECOYS = ['road', 'building', 'person'];
// The order the model scores classes in. embeds.json stores one vector per class in this order.
export const CLASSES = [...QUESTS, ...DECOYS];

// What CLIP reads for each class.
export const CLASS_PROMPTS = {
  tree: 'a photo of a tree',
  sky: 'a photo of the sky',
  flower: 'a photo of a flower',
  grass: 'a photo of grass',
  bird: 'a photo of a bird',
  dog: 'a photo of a dog',
  cat: 'a photo of a cat',
  water: 'a photo of a lake or river',
  road: 'a photo of a road',
  building: 'a photo of a building',
  person: 'a photo of a person',
};

// How the app names a class in a sentence: "found: a tree", "get closer to the sky".
export const CLASS_LABELS = {
  tree: 'a tree',
  sky: 'the sky',
  flower: 'a flower',
  grass: 'grass',
  bird: 'a bird',
  dog: 'a dog',
  cat: 'a cat',
  water: 'water',
  road: 'a road',
  building: 'a building',
  person: 'a person',
};

// FNV-1a, 32-bit: turns the date string into a seed.
export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32: a tiny seeded random number generator. Returns floats in [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// date: an IST calendar date, 'YYYY-MM-DD'. One quest from the anywhere set, then two more distinct ones.
export function questsFor(date) {
  const rand = mulberry32(fnv1a(date));
  const first = ANYWHERE[Math.floor(rand() * ANYWHERE.length)];
  const rest = QUESTS.filter((q) => q !== first);
  const second = rest.splice(Math.floor(rand() * rest.length), 1)[0];
  const third = rest[Math.floor(rand() * rest.length)];
  return [first, second, third];
}
