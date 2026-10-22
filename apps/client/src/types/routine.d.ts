interface NewStep {
  period: RoutinePeriod;
  title: string;
  instruction: string;
  recommendationId?: string;
  consumeRecommendation?: boolean;
}

interface StepSuggestion {
  key: string;
  title: string;
  instruction: string;
  recommendationId: string;
  consumeRecommendation: boolean;
  source: "Product" | "Habit" | "Routine";
}