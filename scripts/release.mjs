import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Keep validation real during rehearsal; only the final registry operation is a dry run.
const dryRun = process.argv.includes('--dry-run');
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!dryRun) {
	if (process.env.GITHUB_ACTIONS !== 'true')
		throw new Error('Publish through the reviewed GitHub Actions tag workflow');
	if (process.env.GITHUB_REF !== `refs/tags/v${manifest.version}`)
		throw new Error('Release tag must match package.json version');
	const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	if (sha !== process.env.GITHUB_SHA)
		throw new Error('Checkout must match the release event commit');
	execFileSync('git', ['merge-base', '--is-ancestor', sha, 'origin/main']);
}
execFileSync('npm', ['run', 'validate'], {
	stdio: 'inherit',
	env: { ...process.env, npm_config_dry_run: 'false', NPM_CONFIG_DRY_RUN: 'false' },
});
execFileSync(
	'npm',
	['publish', '--provenance', '--access', 'public', ...(dryRun ? ['--dry-run'] : [])],
	{
		stdio: 'inherit',
		env: { ...process.env, RELEASE_MODE: 'true' },
	},
);
