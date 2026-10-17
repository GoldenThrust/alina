/** Tiny normalised-collection helpers. All pure, all immutable. */

export const emptyEntities = <T extends HasId>(): Entities<T> => ({ byId: {}, ids: [] });

export function upsertMany<T extends HasId>(e: Entities<T>, items: readonly T[]): Entities<T> {
  const byId = { ...e.byId };
  const ids = [...e.ids];
  for (const item of items) {
    if (!(item.id in byId)) ids.push(item.id);
    byId[item.id] = item;
  }
  return { byId, ids };
}

export const setAll = <T extends HasId>(items: readonly T[]): Entities<T> =>
  upsertMany(emptyEntities<T>(), items);

export const upsertOne = <T extends HasId>(e: Entities<T>, item: T): Entities<T> =>
  upsertMany(e, [item]);

export function patchOne<T extends HasId>(
  e: Entities<T>,
  id: string,
  patch: Partial<Omit<T, "id">>,
): Entities<T> {
  const current = e.byId[id];
  if (!current) return e;
  return { ...e, byId: { ...e.byId, [id]: { ...current, ...patch } } };
}

export function removeMany<T extends HasId>(e: Entities<T>, remove: readonly string[]): Entities<T> {
  const drop = new Set(remove);
  const byId: Record<string, T> = {};
  for (const id of e.ids) if (!drop.has(id)) byId[id] = e.byId[id]!;
  return { byId, ids: e.ids.filter((id) => !drop.has(id)) };
}

export const removeOne = <T extends HasId>(e: Entities<T>, id: string): Entities<T> =>
  removeMany(e, [id]);

/** Swap `oldId` for `item` in place (used to reconcile optimistic records). */
export function replaceOne<T extends HasId>(e: Entities<T>, oldId: string, item: T): Entities<T> {
  if (!(oldId in e.byId)) return upsertOne(e, item);
  const byId = { ...e.byId };
  delete byId[oldId];
  byId[item.id] = item;
  const ids = [...new Set(e.ids.map((id) => (id === oldId ? item.id : id)))];
  return { byId, ids };
}

export const selectAll = <T extends HasId>(e: Entities<T>): T[] => e.ids.map((id) => e.byId[id]!);
