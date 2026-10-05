const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const pluginDir = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin');
const jarPath = path.join(pluginDir, 'shared-testutil', 'build', 'libs', 'shared-testutil.jar');

if (fs.existsSync(pluginDir)) {
  if (!fs.existsSync(jarPath)) {
    console.log('📦 [@react-native/gradle-plugin] Building Gradle plugin JARs for IDE support...');
    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'gradlew.bat jar assemble' : './gradlew jar assemble';
      execSync(cmd, { cwd: pluginDir, stdio: 'inherit' });
      console.log('✅ [@react-native/gradle-plugin] Built Gradle plugin JARs successfully.');
    } catch (err) {
      console.warn('⚠️ [@react-native/gradle-plugin] Could not build JARs automatically:', err.message);
    }
  } else {
    console.log('✅ [@react-native/gradle-plugin] shared-testutil.jar already exists.');
  }
}
