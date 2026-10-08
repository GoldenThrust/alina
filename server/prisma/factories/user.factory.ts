import { hash } from "argon2";
import { prisma } from "../../config/prisma.ts";
import { faker } from "@faker-js/faker";
import type {
  UserCreateInput,
  UserCreateManyInput,
} from "../../generated/prisma/models.ts";
import { writeFileSync } from "node:fs";

export async function createUser({
  users,
  randomCount = 0,
}: {
  users?: UserCreateManyInput[];
  randomCount?: number;
}) {
  const userPassword = [];

  if (users) {
    for await (const user of users) {
      userPassword.push(`${user.email} - ${user.password}\n`);
      user.password = await hash(user.password!);
    }

    await prisma.user.createMany({
      data: users,
    });
  }

  for (let i = 0; i < randomCount; i++) {
    const gender = faker.helpers.arrayElement(["male", "female", "none"]);
    const fakerGender = gender === "none" ? "generic" : gender;

    const user: UserCreateInput = {
      email: `${faker.internet.email()}`.toLowerCase(),
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      gender: gender,
      role: faker.helpers.arrayElement([
        "customer",
        "admin",
        "restaurant_owner",
        "delivery_person",
        "staff",
      ]),
      password: `P${faker.internet.password({ length: 8, memorable: true })}@01`,
      phoneNumber: faker.phone.number({ style: "mobile" }),
      emailVerifiedAt:
        Math.random() > 0.5 ? faker.date.recent({ days: 30 }) : null,
      image: faker.image.personPortrait({ sex: fakerGender }),
      dateOfBirth:
        Math.random() > 0.5
          ? faker.date.birthdate({ min: 18, max: 65, mode: "age" })
          : null,
    };

    userPassword.push(`${user.email} - ${user.password}\n`);
    user.password = await hash(user.password!);

    writeFileSync("./userpassword.txt", userPassword.toString().replaceAll(",", ""));
    await prisma.user.create({
      data: user,
    });
  }
}

export async function createOauthAcount({
  oauthAccounts,
  randomCount = 0,
}: {
  oauthAccounts?: any[];
  randomCount?: number;
}) {
  await prisma.oAuthAccount.createMany({
    data: oauthAccounts ?? [],
  });

  const users = await prisma.user.findMany();
  for (let i = 0; i < randomCount; i++) {
    const user = faker.helpers.arrayElement(users);
    if (!user) {
      continue;
    }

    await prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: faker.helpers.arrayElement([
          "google",
          "github",
          "facebook",
          "apple",
        ]),
        providerId: faker.string.alphanumeric(24),
      },
    });
  }
}

export async function createSession({
  sessions,
  randomCount = 0,
}: {
  sessions?: any[];
  randomCount?: number;
}) {
  await prisma.session.createMany({
    data: sessions ?? [],
  });

  const users = await prisma.user.findMany();
  for (let i = 0; i < randomCount; i++) {
    const user = faker.helpers.arrayElement(users);
    if (!user) {
      continue;
    }

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshSecret: faker.string.alphanumeric(32),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        expiresAt: faker.date.soon({ days: 30 }),
        revokedAt: faker.datatype.boolean()
          ? faker.date.recent({ days: 5 })
          : null,
      },
    });
  }
}
export async function createVehicleInfo({
  vehicleInfos,
  randomCount = 0,
}: {
  vehicleInfos?: any[];
  randomCount?: number;
}) {
  await prisma.vehicleInfo.createMany({
    data: vehicleInfos ?? [],
  });

  const users = await prisma.user.findMany();
  for (let i = 0; i < randomCount; i++) {
    const user = faker.helpers.arrayElement(users);
    if (!user) {
      continue;
    }

    await prisma.vehicleInfo.create({
      data: {
        userId: user.id,
        vehicleType: faker.helpers.arrayElement([
          "bicycle",
          "motorcycle",
          "car",
          "van",
          "truck",
          "walking",
          "scooter",
        ]),
        vehicleMake: faker.vehicle.manufacturer(),
        vehicleModel: faker.vehicle.model(),
        vehicleYear: faker.number.int({ min: 2010, max: 2026 }),
        vehicleColor: faker.vehicle.color(),
        licensePlate: faker.string.alphanumeric(8).toUpperCase(),
        insuranceNumber: faker.string.alphanumeric(12),
        insuranceExpiry: faker.date.future({ years: 2 }),
        registrationNumber: faker.string.alphanumeric(12),
        registrationExpiry: faker.date.future({ years: 2 }),
        drivingLicenseNumber: faker.string.alphanumeric(12),
        drivingLicenseExpiry: faker.date.future({ years: 3 }),
        vehicleDocuments: { insured: true },
        isVerified: faker.datatype.boolean(),
        verifiedAt: faker.datatype.boolean()
          ? faker.date.recent({ days: 30 })
          : null,
        verifiedBy: null,
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      },
    });
  }
}
