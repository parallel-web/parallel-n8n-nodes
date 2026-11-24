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
	'contentSchema',
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

interface LocatedSchema {
	node: IDataObject;
	resource: string;
}

function findPointerTarget(
	root: IDataObject,
	pointer: string,
	resource: string,
	schemas: ReadonlyMap<string, LocatedSchema>,
): LocatedSchema | undefined {
	let value: unknown = root;
	let path = '';
	for (const token of pointer.slice(1).split('/')) {
		const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
		if (Array.isArray(value) && /^(0|[1-9]\d*)$/.test(key)) value = value[Number(key)];
		else if (isSchemaObject(value) && hasOwn(value, key)) value = value[key];
		else return undefined;
		resource = schemas.get(path)?.resource ?? resource;
		path += `/${token}`;
	}
	return isSchemaObject(value) ? { node: value, resource } : undefined;
}

function relocateReferences(
	root: IDataObject,
	idKey: string,
	keepRootDefinitions: boolean,
): IDataObject {
	// Use an in-memory base for relative identifiers. No references are fetched.
	const base = 'https://schema.invalid/';
	const resources = new Map<string, string>();
	const anchors = new Map<string, string>();
	const schemas = new Map<string, LocatedSchema>();
	const nodes: LocatedSchema[] = [];
	function register(node: IDataObject, pointer: string, parent: string): string {
		const existing = schemas.get(pointer);
		if (existing) return existing.resource;
		const id = node[idKey];
		const uri = typeof id === 'string' ? resolveUri(id, parent) : undefined;
		const resource = uri ? uri.href.split('#')[0] : parent;
		if (uri?.hash) anchors.set(uri.href, pointer);
		else if (uri) resources.set(resource, pointer);
		for (const anchor of [node.$anchor, node.$dynamicAnchor]) {
			if (typeof anchor === 'string') anchors.set(`${resource}#${anchor}`, pointer);
		}
		const located = { node, resource };
		schemas.set(pointer, located);
		nodes.push(located);
		return resource;
	}
	visitSchemas(root, '', base, register);

	const refNames = new Map<string, string>();
	const definitions: IDataObject = {};
	const reserved = keepRootDefinitions && isSchemaObject(root.$defs) ? root.$defs : {};
	const keepRootPointers = keepRootDefinitions && nodes.every(({ node }) => !hasOwn(node, idKey));
	let nextDefinition = 0;
	for (const { node, resource } of nodes) {
		const ref = node.$ref;
		if (typeof ref !== 'string') continue;
		const uri = resolveUri(ref, resource);
		if (!uri) continue;
		const document = uri.href.split('#')[0];
		const pointer =
			resources.get(document) ?? (document === base && ref.startsWith('#') ? '' : undefined);
		let fragment: string;
		try {
			fragment = decodeURIComponent(uri.hash.slice(1));
		} catch {
			continue;
		}
		const target =
			!fragment || fragment.startsWith('/')
				? pointer === undefined
					? undefined
					: `${pointer}${fragment}`
				: anchors.get(`${document}#${fragment}`);
		if (target === undefined) continue;
		let located = schemas.get(target);
		if (!located) {
			// A JSON Pointer may name a schema stored under an extension keyword.
			located = findPointerTarget(root, target, document, schemas);
			if (!located) continue;
			visitSchemas(located.node, target, located.resource, register);
		}
		// Provider formatting can drop intermediate keywords below a hoisted definition.
		if (keepRootPointers && resource === base && /^\/\$defs\/[^/]*$/.test(fragment)) continue;
		let name = refNames.get(target);
		if (!name) {
			do {
				name = `saved${nextDefinition++}`;
			} while (hasOwn(reserved, name));
			refNames.set(target, name);
			definitions[name] = located.node;
		}
		node.$ref = `#/$defs/${name}`;
	}
	if (refNames.size) {
		// Every relocated reference starts at the new root, outside the old URI scopes.
		for (const { node } of nodes) delete node[idKey];
	}
	return definitions;
}

export function prepareResearchSchema(schema: IDataObject, wrap: boolean): IDataObject {
	const { $schema, ...root } = structuredClone(schema);
	const idKey = typeof $schema === 'string' && $schema.includes('/draft-04/') ? 'id' : '$id';
	// Research hoists only root $defs when it combines the answer and citation schemas.
	// Keep pointer targets there so they survive that second wrapping step.
	const definitions = relocateReferences(root, idKey, !wrap);
	const hasRelocatedReferences = Object.keys(definitions).length > 0;
	if (!wrap) {
		if (!hasRelocatedReferences) return schema;
		if ($schema !== undefined) root.$schema = $schema;
		return {
			...root,
			$defs: { ...(isSchemaObject(root.$defs) ? root.$defs : {}), ...definitions },
		};
	}

	const envelope: IDataObject = {
		type: 'object',
		properties: { [researchValueKey]: hasRelocatedReferences ? root : schema },
		required: [researchValueKey],
		additionalProperties: false,
	};
	if ($schema !== undefined) envelope.$schema = $schema;
	if (hasRelocatedReferences) envelope.$defs = definitions;
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
