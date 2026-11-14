# hypnotize

Track everything you watch and read (movies, series, anime, cartoons, books and manga) in an app that looks like a streaming service, synced across your phone, TV, computer and your tracking sites.

This repository only holds the installable releases. **[Download the latest release →](../../releases/latest)**

| Device | File | How to install | Updates |
|---|---|---|---|
| Android phone or tablet | `hypnotize-android-<version>.apk` | Open it on the device; allow installing from your browser or file manager when asked | In the app: "hypnotize X is available → Update" |
| Android TV, Google TV, Fire TV | Same `.apk` | Install with the Downloader app (Fire TV) or `adb install` | Same, in the app |
| Windows | `hypnotize-windows-<version>.exe` | Run the installer | Automatic, on launch |
| macOS | `hypnotize-macos-<version>.dmg` | Drag to Applications | Automatic, on launch |
| Linux | `.AppImage` or `.deb` | `chmod +x` and run, or `sudo apt install ./file.deb` | Automatic for AppImage |
| Chrome, Edge, Brave | `hypnotize-chrome-<version>.zip` | Unzip, open `chrome://extensions`, turn on Developer mode, Load unpacked | Shown in the extension; the Chrome Web Store version updates itself |
| Firefox | `hypnotize-firefox-<version>.xpi` | Open the file in Firefox | Automatic |
| Samsung TV (Tizen) | `hypnotize-tizen-<version>.wgt` | Developer mode + Tizen Studio device manager | The app tells you when a new version is out |
| LG TV (webOS) | `hypnotize-webos-<version>.ipk` | Developer Mode app + `ares-install` | The app tells you when a new version is out |
| Kodi | `service.hypnotize-<version>.zip` | Add-ons → Install from zip file | Kodi tells you when a new version is out |
| Web | — | Open the website; nothing to install | Always the newest |
| iPhone, iPad, Apple TV | — | Through the App Store or TestFlight (Apple doesn't allow installing apps from GitHub) | App Store |

Each release lists what changed. Files are checked with SHA-256 by the apps before installing; the sums are in `latest.json` on every release.

Found a problem? [Open an issue](../../issues/new).
