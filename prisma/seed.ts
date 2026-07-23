import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_CHANNELS = [
  {
    name: "general",
    slug: "general",
    description: "Cohort general discussion",
    kind: "PUBLIC" as const,
  },
  {
    name: "announcements",
    slug: "announcements",
    description: "Staff and operator announcements only",
    kind: "ANNOUNCEMENTS" as const,
  },
  {
    name: "reviews",
    slug: "reviews",
    description: "Peer review coordination",
    kind: "PUBLIC" as const,
  },
];

async function main() {
  for (const channel of DEFAULT_CHANNELS) {
    await prisma.channel.upsert({
      where: { slug: channel.slug },
      update: {
        name: channel.name,
        description: channel.description,
        kind: channel.kind,
        archived: false,
      },
      create: channel,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "Cohort Admin";

  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: UserRole.ADMIN, name: adminName, passwordHash },
      create: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Admin ready: ${adminEmail}`);
  }

  console.log("Seeded channels: general, announcements, reviews");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
