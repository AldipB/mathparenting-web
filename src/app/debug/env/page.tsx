"use client";

export default function EnvDebug() {
  // Read from NEXT_PUBLIC_* which are exposed to the client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "(missing)";

  // Mask the key so we don't reveal it entirely in the UI
  const mask = (s: string, visible = 6) =>
    s.length <= visible ? s : s.slice(0, visible) + "..." + s.slice(-4);

  return (
    <div style={{ padding: 24 }}>
      <h1>Env Debug</h1>
      <p>URL: <b>{url}</b></p>
      <p>Anon key: <b>{key === "(missing)" ? "(missing)" : mask(key)}</b></p>
      <p style={{ marginTop: 12, color: "#555" }}>
        If URL shows (missing) or the key shows (missing), your <code>.env.local</code> isn’t loading.
      </p>
    </div>
  );
}
