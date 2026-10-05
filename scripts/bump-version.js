const fs = require('fs');
const path = require('path');

// 1. Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 2. Increment patch version (e.g. 1.0.0 -> 1.0.1)
const versionParts = pkg.version.split('.').map(Number);
versionParts[2] = (versionParts[2] || 0) + 1;
const newVersionName = versionParts.join('.');
pkg.version = newVersionName;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// 3. Update android/app/build.gradle (versionName & versionCode)
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
const currentVersionCode = versionCodeMatch ? parseInt(versionCodeMatch[1], 10) : 1;
const newVersionCode = currentVersionCode + 1;

buildGradle = buildGradle.replace(/versionCode\s+\d+/, `versionCode ${newVersionCode}`);
buildGradle = buildGradle.replace(/versionName\s+"[^"]+"/, `versionName "${newVersionName}"`);

fs.writeFileSync(buildGradlePath, buildGradle, 'utf8');

console.log(`\n✅ Version successfully updated!`);
console.log(`   versionName : ${newVersionName}`);
console.log(`   versionCode : ${newVersionCode}\n`);
