let listeners: (() => void)[] = [];

export const languageStore = {
  onChange(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  notify() {
    listeners.forEach(listener => listener());
  },
};
