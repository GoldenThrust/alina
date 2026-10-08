import { faker } from "@faker-js/faker";
import {
  createOauthAcount,
  createSession,
  createUser,
  createVehicleInfo,
} from "../factories/user.factory.ts";
import { prisma } from "../../config/prisma.ts";

console.info("Seeding users...");
await prisma.user.deleteMany({
  where: {
    email: {
      in: ["olajide@yummy.com", "adeniji@yummy.com"],
    },
  }
});

await createUser({
  users: [
    {
      email: "olajide@yummy.com",
      name: "Adeniji Olajide",
      gender: "male",
      role: "customer",
      password: "Password123@",
      image: faker.image.avatar(),
      emailVerifiedAt: new Date(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
    },
    {
      email: "adeniji@yummy.com",
      name: "Adeniji Olajide",
      gender: "male",
      role: "restaurant_owner",
      password: "Password123@",
      emailVerifiedAt: new Date(),
      image: faker.image.avatar(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: "age" }),
    },
  ],
  randomCount: 100,
});

await createOauthAcount({
  randomCount: 50,
});

await createSession({
  randomCount: 50,
});

await createVehicleInfo({
  randomCount: 40,
});

console.info("Seeding users completed.");