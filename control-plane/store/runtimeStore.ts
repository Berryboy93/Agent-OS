import { featureFlags } from '../config/featureFlags';
import { preferences } from '../config/preferences';

export const runtimeStore = {
  flags: { ...featureFlags },
  prefs: { ...preferences },
};
