export const routineRecommendation = (routine?: Routine) =>
  routine?.recommendations.find((r) => r.type === "ROUTINE");

export const acceptedRecommendation = (routine?: Routine): boolean =>
  !!routineRecommendation(routine)?.accepted;