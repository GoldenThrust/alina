/* ---------- Dummy routines (remove once the API is wired up) ---------- */

type StepSeed = Pick<RoutineStep, "period" | "title" | "instruction">;

// Builds steps with ids and positions derived from their order in the list
const buildSteps = (routineId: string, seeds: StepSeed[]): RoutineStep[] =>
  seeds.map((seed, i) => ({
    id: `${routineId}-step-${i + 1}`,
    routineId,
    position: i + 1,
    ...seed,
  }));

const daysAgo = (days: number, hour = 8) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

export const MOCK_ROUTINES: Routine[] = [
  {
    id: "routine-1",
    userId: "user-1",
    title: "Hydrate & Protect Daily Routine",
    accepted: true,
    createdAt: daysAgo(60),
    steps: buildSteps("routine-1", [
      {
        period: "MORNING",
        title: "Cleanse",
        instruction:
          "Massage a pea-sized amount of gentle gel cleanser onto damp skin for 30 seconds, then rinse with lukewarm water.",
      },
      {
        period: "MORNING",
        title: "Tone",
        instruction:
          "Pat rose water toner onto your face with clean hands to rebalance skin before serums.",
      },
      {
        period: "MORNING",
        title: "Serum",
        instruction:
          "Apply 2-3 drops of vitamin C serum to face and neck, then let it absorb for a minute.",
      },
      {
        period: "MORNING",
        title: "Moisturize",
        instruction:
          "Smooth on a ceramide cream or niacinamide gel, depending on how oily your T-zone feels today.",
      },
      {
        period: "MORNING",
        title: "Sunscreen",
        instruction:
          "Finish with a generous layer of SPF 50 (about two finger-lengths).",
      },
      {
        period: "AFTERNOON",
        title: "Reapply SPF",
        instruction:
          "Reapply sunscreen every two hours when you're outdoors, or once around midday if you're mostly inside.",
      },
      {
        period: "HABIT",
        title: "Stay hydrated",
        instruction:
          "Drink water consistently through the day to support your moisture and firmness scores.",
      },
    ]),
  },
  {
    id: "routine-2",
    userId: "user-1",
    title: "Night Renewal Routine",
    accepted: false,
    createdAt: daysAgo(30),
    steps: buildSteps("routine-2", [
      {
        period: "EVENING",
        title: "Cleanse",
        instruction:
          "Remove sunscreen and impurities with a gentle gel cleanser. Double cleanse if you wore makeup.",
      },
      {
        period: "EVENING",
        title: "Hydrating serum",
        instruction:
          "Apply hyaluronic serum to slightly damp skin to lock in hydration.",
      },
      {
        period: "NIGHT",
        title: "Retinol treatment",
        instruction:
          "Use a pea-sized amount of retinol on 2 nights per week, avoiding the eye area. Build up slowly as tolerated.",
      },
      {
        period: "NIGHT",
        title: "Barrier cream",
        instruction:
          "Seal everything in with a ceramide moisturizer to reduce dryness and irritation.",
      },
      {
        period: "HABIT",
        title: "Wind down for sleep",
        instruction:
          "Aim for 7-8 hours of sleep to help reduce dark circles and eye bags.",
      },
    ]),
  },
  {
    id: "routine-3",
    userId: "user-1",
    title: "Weekly Pore Refining Reset",
    accepted: true,
    createdAt: daysAgo(14),
    steps: buildSteps("routine-3", [
      {
        period: "EVENING",
        title: "Cleanse",
        instruction:
          "Once a week, start with a gentle cleanse to remove surface oil.",
      },
      {
        period: "EVENING",
        title: "BHA exfoliant",
        instruction:
          "Apply BHA liquid with a cotton pad, focusing on the nose and cheeks. Leave on, do not rinse.",
      },
      {
        period: "NIGHT",
        title: "Soothe",
        instruction:
          "Follow with a calming moisturizer and skip other actives for the rest of the evening.",
      },
    ]),
  },
];

// Logs only exist for accepted routines, going back ~3 weeks
export const MOCK_ROUTINE_LOGS: RoutineLog[] = [
  // Daily routine: roughly daily, skipping every 4th day
  ...Array.from({ length: 20 }, (_, i) => i)
    .filter((i) => i % 4 !== 3)
    .map((i) => ({
      id: `routine-log-1-${i + 1}`,
      userId: "user-1",
      routineId: "routine-1",
      createdAt: daysAgo(i, 8),
    })),
  // Weekly reset: once a week
  ...[2, 9, 16].map((days, i) => ({
    id: `routine-log-3-${i + 1}`,
    userId: "user-1",
    routineId: "routine-3",
    createdAt: daysAgo(days, 21),
  })),
].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());