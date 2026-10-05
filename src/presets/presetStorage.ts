import type { PresetSchema } from '../types/preset';
import { FACTORY_PRESETS } from './defaultPresets';

const STORAGE_KEY = 'web_guitar_fx_user_presets_v1';

export function loadAllPresets(): PresetSchema[] {
  let userPresets: PresetSchema[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        userPresets = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read user presets from localStorage', e);
  }
  return [...FACTORY_PRESETS, ...userPresets];
}

export function saveUserPreset(preset: Omit<PresetSchema, 'category' | 'version'>): PresetSchema {
  const newPreset: PresetSchema = {
    ...preset,
    version: 1,
    category: 'user',
  };

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existing: PresetSchema[] = existingRaw ? JSON.parse(existingRaw) : [];
    const filtered = existing.filter((p) => p.id !== newPreset.id);
    filtered.push(newPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save preset to localStorage', e);
  }

  return newPreset;
}

export function deleteUserPreset(presetId: string): void {
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (!existingRaw) return;
    const existing: PresetSchema[] = JSON.parse(existingRaw);
    const updated = existing.filter((p) => p.id !== presetId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete preset from localStorage', e);
  }
}

export function exportPresetsToJson(presets: PresetSchema[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `guitar_fx_presets_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
