type CursorPaginationQuery = {
  Querystring: {
    cursor?: string;
    limit?: number;
  };
};

type PagePaginationQuery = {
  Querystring: {
    page?: number;
    limit?: number;
  };
};

type MetadataQuery = CursorPaginationQuery &
  PagePaginationQuery & {
    Querystring: {
      longitude?: number;
      latitude?: number;
      popular?: boolean;
      topRated?: boolean;
      radius?: number;
      categoryName?: string;
    };
  };

type LocationCursor = {
  id: string;
  distance?: number;
  score?: number;
  rating?: number;
  total_reviews?: number;
};
