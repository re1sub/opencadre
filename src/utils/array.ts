export function uniqueValues<T, K extends string>(
	items: T[],
	key: (item: T) => K | null | undefined,
): K[] {
	const seen = new Set<K>();
	const result: K[] = [];
	for (const item of items) {
		const value = key(item);
		if (value == null || value === "" || seen.has(value)) continue;
		seen.add(value);
		result.push(value);
	}
	return result;
}

export function indexBy<T, K extends PropertyKey, V>(
	items: T[],
	key: (item: T) => K,
	value: (item: T) => V,
): Record<K, V> {
	return Object.fromEntries(
		items.map((item) => [key(item), value(item)]),
	) as Record<K, V>;
}

export function resolveRefs<T extends { id: string }>(
	ids: (string | undefined)[] | undefined,
	collection: T[],
): (T | undefined)[] {
	return (ids ?? []).map((id) =>
		id ? collection.find((item) => item.id === id) : undefined,
	);
}
