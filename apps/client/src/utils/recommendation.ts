export function acceptedRecommendation(r: Routine | Product | undefined): boolean {
    console.log("Checking accepted recommendation for:", r?.recommendation);
    if (!r) return true;
    return r.recommendation?.accepted ?? true;
}