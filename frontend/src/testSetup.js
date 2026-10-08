import '@testing-library/jest-dom/vitest';

const storedValues = new Map();
const storage = {
  getItem(key) {
    return storedValues.has(key) ? storedValues.get(key) : null;
  },
  setItem(key, value) {
    storedValues.set(String(key), String(value));
  },
  removeItem(key) {
    storedValues.delete(key);
  },
  clear() {
    storedValues.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage,
});
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: storage,
});
