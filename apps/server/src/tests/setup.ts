import { afterAll } from "vitest";
import { db } from "../prisma/db.ts";

afterAll(async () => {
    await db.orm.public.User.where({}).deleteAll();
})