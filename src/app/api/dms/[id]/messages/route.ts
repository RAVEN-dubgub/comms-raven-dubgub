import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function assertMember(conversationId: string, userId: string) {
  return prisma.directMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
}

export async function GET(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await assertMember(id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
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
  if (!(await assertMember(id, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      body: parsed.data.body,
      authorId: user.id,
      conversationId: id,
    },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await prisma.directConversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  const peers = await prisma.directMember.findMany({
    where: { conversationId: id, userId: { not: user.id } },
    select: { userId: true },
  });

  if (peers.length) {
    await prisma.notification.createMany({
      data: peers.map((p) => ({
        userId: p.userId,
        messageId: message.id,
        kind: "dm",
        preview: parsed.data.body.slice(0, 140),
      })),
    });
  }

  return NextResponse.json({ message }, { status: 201 });
}
