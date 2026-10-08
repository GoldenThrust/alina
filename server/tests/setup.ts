import { afterAll } from "vitest";
import { prisma } from "../config/prisma.ts";

afterAll(async () => {
    await prisma.user.deleteMany({});
})