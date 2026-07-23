import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany({
    where: { archived: false, kind: { in: ["PUBLIC", "ANNOUNCEMENTS"] } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      kind: true,
      archived: true,
    },
  });

  return NextResponse.json({ channels });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid channel data" }, { status: 400 });
  }

  const slug = slugify(parsed.data.name);
  if (!slug) {
    return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });
  }

  const existing = await prisma.channel.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Channel already exists" }, { status: 409 });
  }

  const channel = await prisma.channel.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      description: parsed.data.description ?? null,
      kind: "PUBLIC",
      members: { create: { userId: user.id } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      kind: true,
      archived: true,
    },
  });

  const members = await prisma.user.findMany({ select: { id: true } });
  await prisma.channelMember.createMany({
    data: members
      .filter((m) => m.id !== user.id)
      .map((m) => ({ channelId: channel.id, userId: m.id })),
    skipDuplicates: true,
  });

  return NextResponse.json({ channel }, { status: 201 });
}
