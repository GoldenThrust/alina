import { afterAll } from "vitest";
import { prisma } from "../config/prisma.ts";

afterAll(async () => {
    await db.orm.public.user.deleteMany({});
})