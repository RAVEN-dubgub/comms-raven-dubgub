import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const messages = await prisma.message.findMany({
    where: {
      body: { contains: q, mode: "insensitive" },
      OR: [
        { channel: { archived: false } },
        { conversation: { members: { some: { userId: user.id } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      author: { select: { id: true, name: true, email: true } },
      channel: { select: { id: true, name: true, slug: true } },
      conversation: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json({
    results: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      author: m.author,
      channel: m.channel,
      conversationId: m.conversationId,
      peer:
        m.conversation?.members.find((mem) => mem.userId !== user.id)?.user ??
        null,
    })),
  });
}
