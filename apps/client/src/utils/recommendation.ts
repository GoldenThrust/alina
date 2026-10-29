export const routineRecommendation = (routine?: Routine) =>
  routine?.recommendations.find((r) => r.type === "ROUTINE");

export const acceptedRecommendation = (routine?: Routine): boolean => {
  const recommendation = routineRecommendation(routine);
  const accepted = !!recommendation?.accepted || !recommendation;
  console.log(`[acceptedRecommendation] routineId=${routine?.id} accepted=${accepted}`, recommendation);
  return accepted;
}
