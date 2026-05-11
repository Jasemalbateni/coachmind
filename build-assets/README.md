# build-assets/

Place your app icon files here. electron-builder reads from this directory.

## Required files

| File | Size | Platform | Notes |
|------|------|----------|-------|
| `icon.ico` | 256×256 | Windows | Multi-size ICO (256, 128, 64, 48, 32, 16 px) |
| `icon.icns` | 512×512 | macOS | ICNS with all required sizes |
| `icon.png` | 512×512 | Linux | Single PNG |
| `dmg-background.png` | 540×380 | macOS | Optional DMG background image |

## Generating icons from a single PNG

Install `electron-icon-maker` or use online tools:

```bash
npx electron-icon-maker --input icon-source.png --output ./build-assets
```

Or use https://www.icoconverter.com for .ico

## Temporary: if no icon is provided

electron-builder will use its default Electron icon. The app will still build
and run correctly — icon is cosmetic only.
