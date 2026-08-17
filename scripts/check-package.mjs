import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const root = new URL('..', import.meta.url).pathname;
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'parallel-n8n-package-'));

try {
	const packOutput = execFileSync(
		'npm',
		['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryDirectory],
		{ cwd: root, encoding: 'utf8' },
	);
	const [packed] = JSON.parse(packOutput);
	const packagePath = join(temporaryDirectory, packed.filename);
	const packagedFiles = new Set(packed.files.map(({ path }) => path));
	const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

	for (const declaredPath of [manifest.main, ...manifest.n8n.credentials, ...manifest.n8n.nodes]) {
		assert.ok(packagedFiles.has(declaredPath), `Missing declared package path: ${declaredPath}`);
	}
	assert.ok(![...packagedFiles].some((path) => path.endsWith('.tsbuildinfo')));
	assert.ok(![...packagedFiles].some((path) => path.startsWith('dist/dist/')));

	execFileSync('npm', ['init', '--yes'], { cwd: temporaryDirectory, stdio: 'ignore' });
	execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', packagePath], {
		cwd: temporaryDirectory,
		stdio: 'ignore',
	});
	const require = createRequire(join(temporaryDirectory, 'consumer.cjs'));
	require(join(temporaryDirectory, 'node_modules', manifest.name));

	console.log(`Validated ${packed.filename} (${packagedFiles.size} files)`);
} finally {
	rmSync(temporaryDirectory, { recursive: true, force: true });
}
