"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractPmLinks } from "@/lib/comms";

type User = { id: string; name: string; email: string; role: "MEMBER" | "ADMIN" };
type Channel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  kind: "PUBLIC" | "ANNOUNCEMENTS" | "DIRECT";
};
type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string };
};
type DmRow = {
  id: string;
  peer: { id: string; name: string; email: string } | null;
  lastMessage: { body: string; createdAt: string } | null;
};
type Notification = {
  id: string;
  kind: string;
  preview: string;
  read: boolean;
  createdAt: string;
  message: { channelId: string | null; conversationId: string | null };
};

type Active =
  | { type: "channel"; id: string; title: string; kind: Channel["kind"] }
  | { type: "dm"; id: string; title: string };

export function CommsWorkspace({
  user,
  pmUrl,
}: {
  user: User;
  pmUrl: string;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dms, setDms] = useState<DmRow[]>([]);
  const [peers, setPeers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<Active | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      body: string;
      author: { name: string };
      channel: { id: string; name: string; slug: string } | null;
      peer: { name: string } | null;
      conversationId: string | null;
    }>
  >([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastStamp = useRef<string | null>(null);

  const canPost = useMemo(() => {
    if (!active) return false;
    if (active.type === "dm") return true;
    if (active.kind === "ANNOUNCEMENTS") return user.role === "ADMIN";
    return true;
  }, [active, user.role]);

  const loadSidebar = useCallback(async () => {
    const [chRes, dmRes, userRes, nRes] = await Promise.all([
      fetch("/api/channels"),
      fetch("/api/dms"),
      fetch("/api/users"),
      fetch("/api/notifications"),
    ]);
    if (chRes.ok) {
      const data = await chRes.json();
      setChannels(data.channels);
      setActive((prev) => {
        if (prev) return prev;
        const first = data.channels[0];
        return first
          ? {
              type: "channel",
              id: first.id,
              title: `#${first.name}`,
              kind: first.kind,
            }
          : null;
      });
    }
    if (dmRes.ok) {
      const data = await dmRes.json();
      setDms(data.conversations);
    }
    if (userRes.ok) {
      const data = await userRes.json();
      setPeers(data.users);
    }
    if (nRes.ok) {
      const data = await nRes.json();
      setNotifications(data.notifications);
      setUnread(data.unread);
    }
  }, []);

  const loadMessages = useCallback(async (target: Active, after?: string) => {
    const path =
      target.type === "channel"
        ? `/api/channels/${target.id}/messages`
        : `/api/dms/${target.id}/messages`;
    const url = after ? `${path}?after=${encodeURIComponent(after)}` : path;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (after) {
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...data.messages.filter((m: Message) => !ids.has(m.id))];
      });
    } else {
      setMessages(data.messages);
    }
    const last = data.messages[data.messages.length - 1] as Message | undefined;
    if (last) lastStamp.current = last.createdAt;
  }, []);

  useEffect(() => {
    void loadSidebar();
  }, [loadSidebar]);

  useEffect(() => {
    if (!active) return;
    lastStamp.current = null;
    void loadMessages(active);
    const timer = setInterval(() => {
      void loadMessages(active, lastStamp.current ?? undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [active, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(search.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      setSearchResults(data.results);
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!active || !draft.trim() || !canPost) return;
    setSending(true);
    setError("");
    const path =
      active.type === "channel"
        ? `/api/channels/${active.id}/messages`
        : `/api/dms/${active.id}/messages`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to send");
      return;
    }
    setDraft("");
    setMessages((prev) => [...prev, data.message]);
    lastStamp.current = data.message.createdAt;
    if (active.type === "dm") void loadSidebar();
  }

  async function createChannel() {
    const name = newChannel.trim();
    if (!name) return;
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create channel");
      return;
    }
    setNewChannel("");
    await loadSidebar();
    setActive({
      type: "channel",
      id: data.channel.id,
      title: `#${data.channel.name}`,
      kind: data.channel.kind,
    });
  }

  async function startDm(peerUserId: string) {
    const res = await fetch("/api/dms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerUserId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not open DM");
      return;
    }
    await loadSidebar();
    setActive({
      type: "dm",
      id: data.conversation.id,
      title: data.conversation.peer.name,
    });
  }

  async function markNotificationsRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <div className="flex h-screen min-h-[640px] overflow-hidden">
      <aside className="flex w-72 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
        <div className="border-b border-[var(--border)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-2)]">
            Cohort Comms
          </p>
          <p className="mt-1 text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          <a
            className="mt-2 inline-block text-xs"
            href={pmUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open PM platform →
          </a>
        </div>

        <div className="space-y-1 overflow-y-auto p-3">
          <p className="px-2 text-xs font-semibold uppercase text-[var(--muted)]">
            Channels
          </p>
          {channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                active?.type === "channel" && active.id === channel.id
                  ? "bg-[var(--panel-2)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-white"
              }`}
              onClick={() =>
                setActive({
                  type: "channel",
                  id: channel.id,
                  title: `#${channel.name}`,
                  kind: channel.kind,
                })
              }
            >
              #{channel.name}
              {channel.kind === "ANNOUNCEMENTS" ? " · staff" : ""}
            </button>
          ))}

          <div className="mt-2 flex gap-1 px-1">
            <input
              className="field !py-1.5 text-sm"
              placeholder="new channel"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
            />
            <button className="btn !px-2" type="button" onClick={() => void createChannel()}>
              +
            </button>
          </div>

          <p className="mt-4 px-2 text-xs font-semibold uppercase text-[var(--muted)]">
            Direct messages
          </p>
          {dms.map((dm) => (
            <button
              key={dm.id}
              type="button"
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                active?.type === "dm" && active.id === dm.id
                  ? "bg-[var(--panel-2)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-white"
              }`}
              onClick={() =>
                setActive({
                  type: "dm",
                  id: dm.id,
                  title: dm.peer?.name ?? "DM",
                })
              }
            >
              {dm.peer?.name ?? "Unknown"}
            </button>
          ))}

          <select
            className="field mt-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) void startDm(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Start a DM...
            </option>
            {peers.map((peer) => (
              <option key={peer.id} value={peer.id}>
                {peer.name} ({peer.email})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-auto border-t border-[var(--border)] p-3">
          <button className="btn w-full text-sm" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">
              {active?.title ?? "Select a channel"}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Polling every 4s · mentions + DMs notify in-app
            </p>
          </div>
          <input
            className="field max-w-xs text-sm"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn text-sm"
            type="button"
            onClick={() => void markNotificationsRead()}
            title="Mark notifications read"
          >
            Alerts {unread > 0 ? `(${unread})` : ""}
          </button>
        </header>

        {search.trim().length >= 2 ? (
          <div className="border-b border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
            <p className="mb-2 text-xs uppercase text-[var(--muted)]">Search results</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No matches</p>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="block w-full rounded-lg bg-[var(--panel)] px-3 py-2 text-left text-sm"
                    onClick={() => {
                      if (result.channel) {
                        setActive({
                          type: "channel",
                          id: result.channel.id,
                          title: `#${result.channel.name}`,
                          kind: "PUBLIC",
                        });
                      } else if (result.conversationId && result.peer) {
                        setActive({
                          type: "dm",
                          id: result.conversationId,
                          title: result.peer.name,
                        });
                      }
                      setSearch("");
                    }}
                  >
                    <span className="text-[var(--muted)]">
                      {result.channel
                        ? `#${result.channel.name}`
                        : result.peer
                          ? `DM · ${result.peer.name}`
                          : "Message"}
                      {" · "}
                      {result.author.name}
                    </span>
                    <span className="mt-0.5 block truncate">{result.body}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}

        {unread > 0 && notifications.some((n) => !n.read) ? (
          <div className="border-b border-[var(--border)] bg-[#1a2433] px-4 py-2 text-sm">
            Latest: {notifications.find((n) => !n.read)?.kind} —{" "}
            {notifications.find((n) => !n.read)?.preview}
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => {
            const links = extractPmLinks(message.body, pmUrl);
            return (
              <article key={message.id} className="rounded-xl bg-[var(--panel)] px-3 py-2">
                <div className="flex items-baseline gap-2">
                  <strong className="text-sm">{message.author.name}</strong>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {message.body}
                </p>
                {links.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {links.map((link) => (
                      <a
                        key={link}
                        className="rounded-full border border-[var(--border)] bg-[var(--panel-2)] px-2 py-0.5 text-xs"
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PM link
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => void sendMessage(e)}
          className="border-t border-[var(--border)] bg-[var(--panel)] p-4"
        >
          {error ? <p className="mb-2 text-sm text-[var(--danger)]">{error}</p> : null}
          {!canPost && active?.type === "channel" && active.kind === "ANNOUNCEMENTS" ? (
            <p className="mb-2 text-sm text-[var(--muted)]">
              Only admins can post in #announcements.
            </p>
          ) : null}
          <div className="flex gap-2">
            <textarea
              className="field min-h-[52px] flex-1 resize-y"
              placeholder={
                canPost
                  ? "Write a message. Use @name to mention. Paste PM task URLs for deep links."
                  : "Read-only channel"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!canPost}
            />
            <button className="btn btn-primary self-end" type="submit" disabled={!canPost || sending}>
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
