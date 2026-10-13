export function getDateInfo() {
  const now = new Date();
  const hour = now.getHours();

  return {
    date: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(now),

    period: `${
      hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : "evening"
    }`,
  };
}