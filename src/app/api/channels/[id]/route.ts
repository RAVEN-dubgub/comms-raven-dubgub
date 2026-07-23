import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }

  const channel = await prisma.channel.findUnique({ where: { id } });
  if (!channel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (channel.kind === "ANNOUNCEMENTS" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only admins can rename or archive announcements" },
      { status: 403 },
    );
  }

  const updated = await prisma.channel.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.archived !== undefined ? { archived: parsed.data.archived } : {}),
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

  return NextResponse.json({ channel: updated });
}
