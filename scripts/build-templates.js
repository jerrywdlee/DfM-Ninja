import { execSync } from 'child_process';
import { readdirSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '../templates');
const outputDir = join(__dirname, '../template_zips');

const bundleMaster = process.argv.includes('--master');

console.log('📦 Starting template zipping process...');

// 1. Clean and create output directory
if (existsSync(outputDir)) {
  console.log(`🧹 Cleaning output directory: ${outputDir}`);
  rmSync(outputDir, { recursive: true, force: true });
}
mkdirSync(outputDir, { recursive: true });

// 2. Iterate through immediate subdirectories in templates/
try {
  const items = readdirSync(templatesDir, { withFileTypes: true });
  const folders = items.filter(item => item.isDirectory());

  if (folders.length === 0) {
    console.warn('⚠️ No template folders found in templates/ directory.');
    process.exit(0);
  }

  folders.forEach(folder => {
    const folderName = folder.name;
    const folderPath = join(templatesDir, folderName);
    const outputPath = join(outputDir, `${folderName}.zip`);

    console.log(`🤐 Zipping: ${folderName} -> ${folderName}.zip`);

    try {
      // Execute zip command
      // -r: recursive (to include contents of the template folder itself)
      // -j: junk paths (we want the files at the root of the zip, but since we cd in, we don't strictly need -j if we do it right)
      // Best way to zip contents: cd into folder and zip everything there.
      
      // Using 'cd [path] && zip -r [output] .'
      // Note: We use absolute path for output to ensure it lands in template_zips
      execSync(`cd "${folderPath}" && zip -r "${outputPath}" . -x "*.DS_Store" "__MACOSX/*"`, { stdio: 'inherit' });
    } catch (zipError) {
      console.error(`❌ Failed to zip ${folderName}:`, zipError.message);
    }
  });

  // 3. Create master templates.zip at the project root
  if (bundleMaster) {
    const masterZipPath = join(__dirname, '../templates.zip');
    console.log(`\n🤐 Creating master zip: templates.zip`);
    try {
      // cd into template_zips and zip all *.zip files into the root templates.zip
      execSync(`cd "${outputDir}" && zip -r "${masterZipPath}" *.zip`, { stdio: 'inherit' });
      console.log(`✅ Master zip created at: ${masterZipPath}`);
    } catch (masterZipError) {
      console.error(`❌ Failed to create master zip:`, masterZipError.message);
    }
  } else {
    console.log('\nℹ️ Skipping master zip creation (use --master flag to enable).');
  }

  console.log(`\n✅ Successfully processed templates.`);
} catch (error) {
  console.error('❌ Template zipping failed:', error.message);
  process.exit(1);
}
