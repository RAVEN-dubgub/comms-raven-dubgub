import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { dmPairKey } from "@/lib/comms";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.directConversation.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { updatedAt: "desc" },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      updatedAt: c.updatedAt,
      peer: c.members.find((m) => m.userId !== user.id)?.user ?? null,
      lastMessage: c.messages[0] ?? null,
    })),
  });
}

const createSchema = z.object({
  peerUserId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid DM request" }, { status: 400 });
  }

  if (parsed.data.peerUserId === user.id) {
    return NextResponse.json({ error: "Cannot DM yourself" }, { status: 400 });
  }

  const peer = await prisma.user.findUnique({
    where: { id: parsed.data.peerUserId },
    select: { id: true, name: true, email: true },
  });
  if (!peer) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const key = dmPairKey(user.id, peer.id);
  let conversation = await prisma.directConversation.findUnique({
    where: { key },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.directConversation.create({
      data: {
        key,
        members: {
          create: [{ userId: user.id }, { userId: peer.id }],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      peer,
    },
  });
}
