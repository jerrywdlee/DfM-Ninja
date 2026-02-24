import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, '../package.json');

try {
  // Read version from package.json
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = pkg.version;
  const tagName = `v${version}`;

  console.log(`🚀 Starting release for version ${version}...`);

  // Check if tag already exists
  try {
    const existingTags = execSync('git tag', { encoding: 'utf8' });
    if (existingTags.split('\n').includes(tagName)) {
      console.error(`❌ Error: Tag ${tagName} already exists.`);
      process.exit(1);
    }
  } catch (e) {
    // Ignore error if git tag fails (e.g. no git repo)
  }

  // Create tag
  console.log(`🏷️  Creating tag ${tagName}...`);
  execSync(`git tag ${tagName}`, { stdio: 'inherit' });

  // Push tag
  console.log(`📤 Pushing tag ${tagName} to origin...`);
  execSync(`git push origin ${tagName}`, { stdio: 'inherit' });

  console.log(`✅ Successfully released ${tagName}!`);
  console.log(`🔗 Checking GitHub Actions for build & deployment status.`);
} catch (error) {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
}
