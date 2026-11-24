import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

export const researchValueKey = 'value';
const schemaMaps = new Set([
	'$defs',
	'definitions',
	'properties',
	'patternProperties',
	'dependentSchemas',
	'dependencies',
]);
const schemaLists = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems', 'items']);
const schemaChildren = new Set([
	'items',
	'additionalItems',
	'additionalProperties',
	'unevaluatedItems',
	'unevaluatedProperties',
	'propertyNames',
	'contains',
	'not',
	'if',
	'then',
	'else',
]);

export function isSchemaObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object: IDataObject, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(object, key);
}

export function acceptsResearchRoot(schema: IDataObject): boolean {
	return schema.type === 'object' && hasOwn(schema, 'properties') && !hasOwn(schema, 'anyOf');
}

function childPointer(parent: string, key: string): string {
	const token = key.replace(/~/g, '~0').replace(/\//g, '~1');
	return `${parent}/${token}`;
}

function visitSchemas<Scope>(
	node: IDataObject,
	pointer: string,
	parent: Scope,
	visit: (node: IDataObject, pointer: string, parent: Scope) => Scope,
): void {
	const scope = visit(node, pointer, parent);
	for (const [keyword, value] of Object.entries(node)) {
		const path = childPointer(pointer, keyword);
		if (
			(schemaMaps.has(keyword) && isSchemaObject(value)) ||
			(schemaLists.has(keyword) && Array.isArray(value))
		) {
			for (const [key, spec] of Object.entries(value)) {
				if (isSchemaObject(spec)) visitSchemas(spec, childPointer(path, key), scope, visit);
			}
		} else if (schemaChildren.has(keyword) && isSchemaObject(value)) {
			visitSchemas(value, path, scope, visit);
		}
	}
}

function resolveUri(id: string, base: string): URL | undefined {
	try {
		return new URL(id, base);
	} catch {
		return undefined;
	}
}

function relocateReferences(root: IDataObject, idKey: string): IDataObject {
	// Use an in-memory base for relative identifiers. No references are fetched.
	const base = 'https://schema.invalid/';
	const resources = new Map<string, string>();
	const anchors = new Map<string, string>();
	const schemas = new Map<string, IDataObject>();
	const nodes: Array<{ node: IDataObject; resource: string }> = [];
	visitSchemas(root, '', base, (node, pointer, parent) => {
		schemas.set(pointer, node);
		const id = node[idKey];
		const uri = typeof id === 'string' ? resolveUri(id, parent) : undefined;
		const resource = uri ? uri.href.split('#')[0] : parent;
		if (uri?.hash) anchors.set(uri.href, pointer);
		else if (uri) resources.set(resource, pointer);
		for (const anchor of [node.$anchor, node.$dynamicAnchor]) {
			if (typeof anchor === 'string') anchors.set(`${resource}#${anchor}`, pointer);
		}
		nodes.push({ node, resource });
		return resource;
	});

	const refNames = new Map<string, string>();
	const definitions: IDataObject = {};
	for (const { node, resource } of nodes) {
		const ref = node.$ref;
		const uri = typeof ref === 'string' ? resolveUri(ref, resource) : undefined;
		if (!uri || typeof ref !== 'string') continue;
		const document = uri.href.split('#')[0];
		const pointer =
			resources.get(document) ?? (document === base && ref.startsWith('#') ? '' : undefined);
		const fragment = decodeURIComponent(uri.hash.slice(1));
		const target =
			!fragment || fragment.startsWith('/')
				? pointer === undefined
					? undefined
					: `${pointer}${fragment}`
				: anchors.get(`${document}#${fragment}`);
		if (target === undefined) continue;
		const spec = schemas.get(target);
		if (!spec) continue;
		let name = refNames.get(target);
		if (!name) {
			name = `saved${refNames.size}`;
			refNames.set(target, name);
			definitions[name] = spec;
		}
		node.$ref = `#/$defs/${name}`;
	}
	if (refNames.size) {
		// Every relocated reference starts at the new root, outside the old URI scopes.
		for (const { node } of nodes) delete node[idKey];
	}
	return definitions;
}

export function wrapResearchSchema(schema: IDataObject): IDataObject {
	const { $schema, ...root } = structuredClone(schema);
	const envelope: IDataObject = {
		type: 'object',
		properties: { [researchValueKey]: schema },
		required: [researchValueKey],
		additionalProperties: false,
	};
	if ($schema !== undefined) envelope.$schema = $schema;
	const idKey = typeof $schema === 'string' && $schema.includes('/draft-04/') ? 'id' : '$id';
	const definitions = relocateReferences(root, idKey);
	if (!Object.keys(definitions).length) return envelope;

	// Research hoists root $defs when it combines the answer and citation schemas.
	// Keep pointer targets there so they survive that second wrapping step.
	envelope.$defs = definitions;
	envelope.properties = { [researchValueKey]: root };
	return envelope;
}

export function unwrapResearchAnswer(content: string, reference: string): string {
	const errorMessage = `Parallel Research returned an invalid structured answer${reference}.`;
	const envelope = jsonParse<unknown>(content, { errorMessage });
	if (
		!isSchemaObject(envelope) ||
		!hasOwn(envelope, researchValueKey) ||
		Object.keys(envelope).length !== 1
	) {
		throw new Error(errorMessage);
	}
	// The one known property name contains no colon. Keep the original value tokens,
	// including numbers that would lose precision if we parsed and reserialized them.
	const answer = content.slice(content.indexOf(':') + 1, content.lastIndexOf('}')).trim();
	jsonParse(answer, { errorMessage });
	return answer;
}
