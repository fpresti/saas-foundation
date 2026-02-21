#!/usr/bin/env node
/**
 * Scaffold a new feature from docs/templates/feature/.
 * Usage: node scripts/new-feature.mjs <feature-name>
 * Example: node scripts/new-feature.mjs my-feature
 *
 * Creates src/app/features/<feature-name>/ with template files.
 * Replaces __feature__ (kebab) and __Feature__ (PascalCase).
 * Does not modify app.routes.ts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const templateDir = path.join(repoRoot, 'docs', 'templates', 'feature');
const featuresDir = path.join(repoRoot, 'src', 'app', 'features');

function kebabToPascal(kebab) {
  return kebab
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function pascalToCamel(pascal) {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function replaceTokens(content, kebab, pascal, camel) {
  return content
    .replace(/__feature__/g, kebab)
    .replace(/__Feature__/g, pascal)
    .replace(/__featureCamel__/g, camel);
}

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, fileList);
    } else {
      fileList.push(path.relative(templateDir, full));
    }
  }
  return fileList;
}

function main() {
  const rawName = process.argv[2];
  if (!rawName || rawName.startsWith('-')) {
    console.error('Usage: node scripts/new-feature.mjs <feature-name>');
    console.error('Example: node scripts/new-feature.mjs my-feature');
    process.exit(1);
  }

  const featureKebab = rawName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  if (!featureKebab) {
    console.error('Feature name must contain at least one letter or number.');
    process.exit(1);
  }

  const featurePascal = kebabToPascal(featureKebab);
  const featureCamel = pascalToCamel(featurePascal);
  const targetDir = path.join(featuresDir, featureKebab);

  if (!fs.existsSync(templateDir)) {
    console.error('Template not found:', templateDir);
    process.exit(1);
  }
  if (fs.existsSync(targetDir)) {
    console.error('Feature folder already exists:', targetDir);
    process.exit(1);
  }

  const relativePaths = walkDir(templateDir);
  for (const rel of relativePaths) {
    const srcPath = path.join(templateDir, rel);
    const content = fs.readFileSync(srcPath, 'utf8');
    const newContent = replaceTokens(content, featureKebab, featurePascal, featureCamel);

    const targetRel = replaceTokens(rel.replace(/\\/g, path.sep), featureKebab, featurePascal, featureCamel);
    const targetPath = path.join(targetDir, targetRel);
    const targetParent = path.dirname(targetPath);
    fs.mkdirSync(targetParent, { recursive: true });
    fs.writeFileSync(targetPath, newContent, 'utf8');
  }

  console.log('Created feature:', targetDir);
  console.log('Wire the route in app.routes.ts, e.g.:');
  console.log(
    `  { path: '${featureKebab}', loadChildren: () => import('./features/${featureKebab}/routes').then(m => m.${featureCamel}Routes) }`
  );
}

main();
