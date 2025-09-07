#!/bin/bash

# Emma - AI Email Companion
# Chrome Web Store Package Builder
# This script creates a clean package for Chrome Web Store submission

echo "🚀 Building Emma - AI Email Companion (Gmail Edition) for Chrome Web Store..."

# Create build directory
BUILD_DIR="build"
PACKAGE_NAME="emma-ai-email-companion-v2.0.0"

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR/$PACKAGE_NAME"

echo "📦 Copying extension files..."

# Copy essential files
cp manifest.json "$BUILD_DIR/$PACKAGE_NAME/"
cp background.js "$BUILD_DIR/$PACKAGE_NAME/"
cp LICENSE "$BUILD_DIR/$PACKAGE_NAME/"

# Copy directories
cp -r icons "$BUILD_DIR/$PACKAGE_NAME/"
cp -r content "$BUILD_DIR/$PACKAGE_NAME/"
cp -r popup "$BUILD_DIR/$PACKAGE_NAME/"

# Copy documentation (optional for extension package)
cp README.md "$BUILD_DIR/$PACKAGE_NAME/"
cp PRIVACY_POLICY.md "$BUILD_DIR/$PACKAGE_NAME/"
cp TERMS_OF_SERVICE.md "$BUILD_DIR/$PACKAGE_NAME/"

# Remove any system files
echo "🧹 Removing system files..."
find "$BUILD_DIR" -name ".DS_Store" -delete
find "$BUILD_DIR" -name "*.log" -delete
find "$BUILD_DIR" -name "node_modules" -exec rm -rf {} + 2>/dev/null || true

# Create ZIP package
echo "📦 Creating ZIP package..."
cd "$BUILD_DIR"
zip -r "${PACKAGE_NAME}.zip" "$PACKAGE_NAME" -x "*.DS_Store" "*.log"

echo "✅ Package created: $BUILD_DIR/${PACKAGE_NAME}.zip"
echo ""
echo "📊 Package contents:"
unzip -l "${PACKAGE_NAME}.zip" | head -20

echo ""
echo "📋 Next Steps:"
echo "1. Test the extension by loading the unpacked folder in Chrome"
echo "2. Upload ${PACKAGE_NAME}.zip to Chrome Web Store Developer Dashboard"
echo "3. Complete the store listing with screenshots and promotional images"
echo "4. Submit for review"

echo ""
echo "🔗 Useful Links:"
echo "• Chrome Developer Dashboard: https://chrome.google.com/webstore/devconsole/"
echo "• Extension Testing: chrome://extensions/ (Enable Developer Mode)"
echo "• Store Listing Guide: See CHROME_STORE_CHECKLIST.md"

# Return to original directory
cd ..

echo ""
echo "🎉 Build complete! Package ready for Chrome Web Store submission."
