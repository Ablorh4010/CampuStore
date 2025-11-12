# CampusAffordHub Mobile App Deployment Guide

This guide will help you deploy CampusAffordHub to the Apple App Store and Google Play Store using Capacitor.

## Prerequisites

### For iOS (App Store)
- **Mac computer** with macOS (required for iOS development)
- **Xcode** (latest version from Mac App Store)
- **Apple Developer Account** ($99/year)
- **CocoaPods** installed: `sudo gem install cocoapods`

### For Android (Play Store)
- **Android Studio** (works on Windows, Mac, or Linux)
- **Google Play Developer Account** ($25 one-time fee)
- **Java Development Kit (JDK)** 11 or higher

## Step 1: Build Your Web App

First, build your web application for production:

```bash
npm run build
```

This creates optimized files in the `dist/public` folder.

## Step 2: Sync with Native Platforms

After building, sync your web assets to the native platforms:

```bash
npx cap sync
```

This copies your web app to both iOS and Android projects and updates native dependencies.

## Step 3: iOS Deployment

### A. Open iOS Project in Xcode

```bash
npx cap open ios
```

This opens your app in Xcode.

### B. Configure Your App in Xcode

1. **Select your project** in the left sidebar (the blue "App" icon)
2. **General tab**:
   - Display Name: `CampusAffordHub`
   - Bundle Identifier: `com.campusaffordhub.app` (must be unique)
   - Version: `1.0.0`
   - Build: `1`
   - Team: Select your Apple Developer team

3. **Signing & Capabilities**:
   - Check "Automatically manage signing"
   - Select your team
   - Xcode will generate provisioning profiles

### C. Add App Icons and Splash Screen

1. **App Icons**:
   - Click on `Assets.xcassets` in Xcode
   - Select `AppIcon`
   - Drag your app icons (various sizes needed: 1024x1024, 180x180, 120x120, etc.)
   - Use a tool like [AppIcon.co](https://appicon.co) to generate all sizes

2. **Splash Screen**:
   - Already configured in `capacitor.config.ts`
   - Uses your brand color (#6366f1)

### D. Test on Simulator

1. Select a simulator from the device dropdown (e.g., "iPhone 15")
2. Click the Play button (▶️) to build and run
3. Test all features work correctly

### E. Archive and Upload to App Store

1. **Archive the app**:
   - Select "Any iOS Device" as target
   - Menu: Product → Archive
   - Wait for build to complete

2. **Upload to App Store Connect**:
   - Window → Organizer
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Follow the wizard

3. **Configure in App Store Connect**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create a new app
   - Fill in app details, screenshots, description
   - Submit for review

**Note**: First review can take 1-2 weeks. Updates are usually faster.

## Step 4: Android Deployment

### A. Open Android Project in Android Studio

```bash
npx cap open android
```

This opens your app in Android Studio.

### B. Configure Your App

1. **Update app details**:
   - Open `android/app/build.gradle`
   - Set `versionCode` (increment for each release)
   - Set `versionName` (e.g., "1.0.0")

2. **App Icon**:
   - Right-click `res` folder → New → Image Asset
   - Select your app icon
   - Generate all sizes

3. **Splash Screen**:
   - Already configured via Capacitor
   - Uses your brand color

### C. Generate Signed APK/Bundle

1. **Create keystore** (first time only):
   ```bash
   keytool -genkey -v -keystore campusstore-release.keystore -alias campusstore -keyalg RSA -keysize 2048 -validity 10000
   ```
   - Save the keystore file safely
   - Remember the password!

2. **Configure signing in Android Studio**:
   - Build → Generate Signed Bundle / APK
   - Select "Android App Bundle"
   - Create new key or choose existing keystore
   - Complete the wizard

3. **Build release bundle**:
   - Choose "release" build variant
   - Wait for build to complete
   - Find the `.aab` file in `android/app/release/`

### D. Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Fill in app details, screenshots, description
4. Upload your `.aab` file to Internal Testing first
5. Test thoroughly, then promote to Production
6. Submit for review

**Note**: First review can take a few days. Updates are usually within hours.

## Step 5: Update Your App

When you make changes to your web app:

1. **Build the web app**:
   ```bash
   npm run build
   ```

2. **Sync with native platforms**:
   ```bash
   npx cap sync
   ```

3. **For iOS**:
   - Open in Xcode: `npx cap open ios`
   - Increment the Build number
   - Archive and upload

4. **For Android**:
   - Open in Android Studio: `npx cap open android`
   - Increment versionCode in build.gradle
   - Generate signed bundle
   - Upload to Play Console

## Quick Reference Commands

```bash
# Build web app
npm run build

# Sync to native platforms
npx cap sync

# Open iOS in Xcode (Mac only)
npx cap open ios

# Open Android in Android Studio
npx cap open android

# Add a new native platform
npx cap add ios
npx cap add android

# Update Capacitor dependencies
npm install @capacitor/core @capacitor/cli
npx cap sync
```

## Important App Store Requirements

### iOS App Store
- Privacy Policy URL (required)
- Terms of Service (recommended)
- App screenshots (various device sizes)
- Age rating questionnaire
- Export compliance information
- App description and keywords

### Google Play Store
- Privacy Policy URL (required)
- Content rating questionnaire
- App screenshots (phone and tablet)
- Feature graphic (1024x500)
- App description and short description
- Target audience and content

## Testing Before Release

1. **Test on real devices**:
   - iOS: Use TestFlight for beta testing
   - Android: Use Internal Testing in Play Console

2. **Test all features**:
   - OTP authentication
   - Buyer/seller mode switching
   - Product browsing and search
   - Cart functionality
   - Messaging system
   - Store management

3. **Test offline mode**:
   - Verify service worker caches work
   - Check app works without internet

## Pricing and Publishing

### Free App with Optional In-App Purchases
If you plan to add paid features later, select "Free with in-app purchases" during app setup.

### Paid App
Set a price during app setup. Both stores will handle payments and taxes.

## Support and Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Developer Documentation](https://developer.apple.com/documentation/)
- [Android Developer Documentation](https://developer.android.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## Common Issues

### iOS Build Errors
- **Code signing errors**: Make sure you're signed in with your Apple ID in Xcode
- **Pod install errors**: Run `cd ios && pod install` in terminal
- **Provisioning profile errors**: Delete and regenerate in Xcode

### Android Build Errors
- **Gradle errors**: Update Android Studio and Gradle
- **SDK errors**: Install required SDK versions in SDK Manager
- **Signing errors**: Verify keystore path and password

## Next Steps

1. **Set up developer accounts**:
   - [Apple Developer Program](https://developer.apple.com/programs/)
   - [Google Play Console](https://play.google.com/console/signup)

2. **Prepare app assets**:
   - App icons (1024x1024 for iOS, various sizes)
   - Screenshots (iPhone, iPad, Android phones, tablets)
   - Feature graphics
   - Privacy policy and terms

3. **Build and test locally**:
   - Run on iOS simulator
   - Run on Android emulator
   - Test on real devices

4. **Submit for review**:
   - Upload to App Store Connect
   - Upload to Google Play Console
   - Wait for approval

Good luck with your app launch! 🚀
