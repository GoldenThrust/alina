interface RecommendationPage {
  recommendations: Recommendation[];
  nextCursor: string | null;
}