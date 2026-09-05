"use client";

import { useThemeStore } from "@/store/themeStore";
import {
  DEFAULT_THEME,
  type DepthLook,
  type FontFamily,
  type FontSize,
  type IconStyle,
  type StylePreset,
} from "@/theme/tokens";
import { Field, SelectInput, ToolButton, ColorPickerRow } from "@/components/ui";
import { WallpaperPicker } from "./WallpaperPicker";

export function AppearancePanel() {
  const theme = useThemeStore();

  return (
    <div className="space-y-4">
      <Field label="Wallpaper">
        <WallpaperPicker
          value={theme.wallpaper}
          onChange={(wallpaper) => theme.setTheme({ wallpaper })}
        />
      </Field>
      <Field label="Font family">
        <SelectInput
          value={theme.fontFamily}
          onChange={(e) => theme.setTheme({ fontFamily: e.target.value as FontFamily })}
        >
          <option value="inter">Inter</option>
          <option value="system">System UI</option>
          <option value="serif">Source Serif</option>
          <option value="mono">JetBrains Mono</option>
          <option value="display">Outfit</option>
        </SelectInput>
      </Field>
      <Field label="Font size">
        <SelectInput
          value={theme.fontSize}
          onChange={(e) => theme.setTheme({ fontSize: e.target.value as FontSize })}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
          <option value="xlarge">X-Large</option>
        </SelectInput>
      </Field>
      <Field label="Primary color">
        <ColorPickerRow value={theme.primary} onChange={(c) => theme.setTheme({ primary: c })} />
      </Field>
      <Field label="Secondary color">
        <ColorPickerRow value={theme.secondary} onChange={(c) => theme.setTheme({ secondary: c })} />
      </Field>
      <Field label="Icon style">
        <SelectInput
          value={theme.iconStyle}
          onChange={(e) => theme.setTheme({ iconStyle: e.target.value as IconStyle })}
        >
          <option value="outline">Outline</option>
          <option value="filled">Filled</option>
          <option value="duotone">Duotone</option>
        </SelectInput>
      </Field>
      <Field label="Depth">
        <SelectInput
          value={theme.look}
          onChange={(e) => theme.setTheme({ look: e.target.value as DepthLook })}
        >
          <option value="2d">2D (flat)</option>
          <option value="3d">3D (shadowed)</option>
        </SelectInput>
      </Field>
      <Field label="Style preset">
        <SelectInput
          value={theme.stylePreset}
          onChange={(e) => theme.setTheme({ stylePreset: e.target.value as StylePreset })}
        >
          <option value="classic">Classic</option>
          <option value="modern">Modern</option>
          <option value="compact">Compact</option>
          <option value="glass">Glass</option>
        </SelectInput>
      </Field>
      <ToolButton className="px-3" onClick={() => theme.reset()}>
        Reset to defaults ({DEFAULT_THEME.stylePreset} / {DEFAULT_THEME.wallpaper})
      </ToolButton>
    </div>
  );
}
