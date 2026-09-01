import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet } from "react-native";

import { getWallpaperPreset, WallpaperSelection } from "@/src/utils/wallpapers";

export function WallpaperBackdrop({
  wallpaper,
  intensity = 0.32,
  gradientOpacity = 0.85,
}: {
  wallpaper: WallpaperSelection;
  intensity?: number;
  gradientOpacity?: number;
}) {
  const preset = getWallpaperPreset(wallpaper.presetId);
  return wallpaper.customBase64 ? (
    <Image
      source={{ uri: wallpaper.customBase64 }}
      style={[StyleSheet.absoluteFillObject, { opacity: intensity }]}
      resizeMode="cover"
    />
  ) : (
    <LinearGradient
      colors={preset.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFillObject, { opacity: gradientOpacity }]}
    />
  );
}
