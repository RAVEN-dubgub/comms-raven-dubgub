import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseMentions } from "@/lib/comms";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel || channel.archived) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId: id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ messages });
}

const postSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel || channel.archived) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (channel.kind === "ANNOUNCEMENTS" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only admins can post in #announcements" },
      { status: 403 },
    );
  }

  const message = await prisma.message.create({
    data: {
      body: parsed.data.body,
      authorId: user.id,
      channelId: id,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  const mentionTokens = parseMentions(parsed.data.body);
  if (mentionTokens.length) {
    const mentioned = await prisma.user.findMany({
      where: {
        OR: mentionTokens.flatMap((token) => [
          { email: { startsWith: token } },
          { name: { equals: token, mode: "insensitive" } },
        ]),
      },
      select: { id: true },
    });

    const notifyIds = mentioned
      .map((m) => m.id)
      .filter((id) => id !== user.id);

    if (notifyIds.length) {
      await prisma.notification.createMany({
        data: notifyIds.map((userId) => ({
          userId,
          messageId: message.id,
          kind: "mention",
          preview: parsed.data.body.slice(0, 140),
        })),
      });
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}
