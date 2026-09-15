import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'parallel-n8n-package-'));

try {
	const packOutput = execFileSync(
		'npm',
		[
			'pack',
			'--dry-run=false',
			'--json',
			'--ignore-scripts',
			'--pack-destination',
			temporaryDirectory,
		],
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

	execFileSync('npm', ['init', '--yes', '--dry-run=false'], {
		cwd: temporaryDirectory,
		stdio: 'ignore',
	});
	execFileSync(
		'npm',
		['install', '--dry-run=false', '--ignore-scripts', '--no-audit', '--no-fund', packagePath],
		{
			cwd: temporaryDirectory,
			stdio: 'ignore',
		},
	);
	const require = createRequire(join(temporaryDirectory, 'consumer.cjs'));
	const installed = join(temporaryDirectory, 'node_modules', manifest.name);
	require(installed);
	for (const entrypoint of [...manifest.n8n.credentials, ...manifest.n8n.nodes]) {
		const exports = require(join(installed, entrypoint));
		const constructors = Object.values(exports).filter((value) => typeof value === 'function');
		assert.ok(constructors.length > 0, `No exported class: ${entrypoint}`);
		for (const Constructor of constructors) {
			const instance = new Constructor();
			assert.ok(
				instance.description?.name || instance.name,
				`Missing node/credential identity: ${entrypoint}`,
			);
		}
	}

	console.log(`Validated ${packed.filename} (${packagedFiles.size} files)`);
} finally {
	rmSync(temporaryDirectory, { recursive: true, force: true });
}
