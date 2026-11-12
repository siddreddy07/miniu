// A very small cache: remembers values for a while, then forgets them
const store = new Map();

export function getFromCache(key) {
  const item = store.get(key);
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    store.delete(key);
    return null;
  }
  return item.value;
}

export function saveToCache(key, value, minutes) {
  store.set(key, { value: value, expiresAt: Date.now() + minutes * 60 * 1000 });
}
