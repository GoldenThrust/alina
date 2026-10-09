export function paginate<T>(items: T[], limit: number) {
  const hasNextPage = items.length > limit;

  const data = hasNextPage ? items.slice(0, -1) : items;

  return {
    data,

    nextCursor: hasNextPage ? (data[data.length - 1] as any).id : null,

    hasNextPage,
  };
}

export function paginateDistance<
  T extends {
    id: string;
    distance: number;
  },
>(items: T[], limit: number) {
  const hasNextPage = items.length > limit;

  const data = hasNextPage ? items.slice(0, -1) : items;

  const last = data[data.length - 1];

  return {
    data,

    nextCursor: hasNextPage
      ? {
          id: last?.id,
          distance: last?.distance,
        }
      : null,

    hasNextPage,
  };
}
