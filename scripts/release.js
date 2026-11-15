const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, description) {
    console.log(`\n⏳ ${description}...`);
    try {
        execSync(command, { stdio: 'inherit' });
    } catch (err) {
        console.error(`\n❌ Failed during: ${description}`);
        console.error('Release aborted. No git tag or push was created.');
        process.exit(1);
    }
}

function main() {
    console.log('🚀 Starting Safe Release Process');

    const rootDir = path.resolve(__dirname, '..');
    const versionPath = path.join(rootDir, 'manifests', 'version.txt');
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');

    if (!fs.existsSync(versionPath)) {
        console.error('❌ manifests/version.txt not found!');
        process.exit(1);
    }

    const version = fs.readFileSync(versionPath, 'utf8').trim();
    console.log(`📌 Target Release Version: ${version}`);

    // Check CHANGELOG.md
    if (fs.existsSync(changelogPath)) {
        const changelog = fs.readFileSync(changelogPath, 'utf8');
        if (!changelog.includes(version)) {
            console.error(`❌ CHANGELOG.md does not mention version ${version}!`);
            console.error('Please update CHANGELOG.md before releasing.');
            process.exit(1);
        }
    }

    // Step 1: Run Linter
    run('npm run lint', 'Step 1/4: Running ESLint');

    // Step 2: Run Tests
    run('npm test', 'Step 2/4: Running Regression Test Suite');

    // Step 3: Check if tag already exists
    try {
        const existingTags = execSync('git tag -l', { encoding: 'utf8' }).split('\n').map(t => t.trim());
        if (existingTags.includes(version)) {
            console.error(`❌ Git tag "${version}" already exists!`);
            console.error('Please bump the version in manifests/version.txt first.');
            process.exit(1);
        }
    } catch (ignore) {}

    // Step 4: Commit, Tag, and Push
    console.log('\n✅ All tests and checks passed!');
    run(`git add manifests/version.txt CHANGELOG.md package.json`, 'Staging release files');
    
    // Commit if there are staged changes
    try {
        execSync(`git commit -m "Release ${version}"`, { stdio: 'inherit' });
    } catch (ignore) {
        console.log('ℹ️ No new changes to commit (already committed).');
    }

    run(`git tag ${version}`, `Creating git tag ${version}`);
    console.log(`\n🏷️ Tag ${version} created locally.`);

    const shouldPush = process.argv.includes('--push');
    if (shouldPush) {
        run(`git push origin master --tags`, `Pushing commit and tag ${version} to origin`);
        console.log(`\n🎉 Release ${version} successfully pushed! GitHub Actions will now build and publish.`);
    } else {
        console.log('\n💡 Tag created locally. To push to GitHub and trigger release workflow, run:');
        console.log(`   git push origin master --tags`);
        console.log('   (or run next time with: npm run release -- --push)');
    }
}

main();
