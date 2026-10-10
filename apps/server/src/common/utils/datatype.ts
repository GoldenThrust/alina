export function toBoolean(value: string | boolean | number): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "true" || normalizedValue === "1") {
      return true;
    } else if (normalizedValue === "false" || normalizedValue === "0") {
      return false;
    }
  }

  throw new Error(`Cannot convert value "${value}" to boolean.`);
}
