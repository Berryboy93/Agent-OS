export type Preferences = {
  theme: 'dark' | 'light';
  compactMode: boolean;
  animationsEnabled: boolean;
  soundEffects: boolean;
};

export const preferences: Preferences = {
  theme: 'dark',
  compactMode: false,
  animationsEnabled: true,
  soundEffects: false,
};
