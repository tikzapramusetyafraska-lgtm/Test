export type WallpaperPreset = {
  id: string;
  name: string;
  colors: [string, string, string];
};

export type WallpaperSelection = {
  presetId: string;
  customBase64: string | null;
};

export const WALLPAPER_KEY = "my-duwit-gwejh-wallpaper-v1";

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { id: "obsidian", name: "Obsidian", colors: ["#121417", "#24333A", "#10231F"] },
  { id: "emerald", name: "Emerald", colors: ["#062319", "#0D4F3C", "#10231F"] },
  { id: "ocean", name: "Ocean", colors: ["#101D2D", "#173B52", "#151A2F"] },
  { id: "plum", name: "Plum", colors: ["#21152E", "#432447", "#16131E"] },
  { id: "ember", name: "Ember", colors: ["#2A1815", "#5A2B20", "#191519"] },
  { id: "slate", name: "Slate", colors: ["#161A22", "#354052", "#191B20"] },
];

export const DEFAULT_WALLPAPER: WallpaperSelection = {
  presetId: "obsidian",
  customBase64: null,
};

export const getWallpaperPreset = (id: string) =>
  WALLPAPER_PRESETS.find((preset) => preset.id === id) ?? WALLPAPER_PRESETS[0];