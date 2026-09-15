// Records finished online games to Supabase (REST, service role).
//
// Failures never affect gameplay: results are logged and swallowed. When the
// env vars are absent (local dev, tests) recording is disabled entirely.

export interface MatchRecordInput {
  roomId: string;
  whiteId: string;
  blackId: string;
  whiteName: string | null;
  blackName: string | null;
  winner: 'white' | 'black' | null;
  reason: string;
  moveCount: number;
}

export interface MatchRecorderConfig {
  url: string;
  serviceRoleKey: string;
}

export function matchRecorderConfig(): MatchRecorderConfig | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

/** Insert one match row; resolves true when stored. Never throws. */
export async function recordMatch(
  input: MatchRecordInput,
  config: MatchRecorderConfig | null
): Promise<boolean> {
  if (!config) return false;
  try {
    const res = await fetch(`${config.url.replace(/\/+$/, '')}/rest/v1/matches`, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        room_id: input.roomId,
        white_id: input.whiteId,
        black_id: input.blackId,
        white_name: input.whiteName,
        black_name: input.blackName,
        winner: input.winner,
        reason: input.reason,
        move_count: input.moveCount,
      }),
    });
    if (!res.ok) {
      console.error('[outwit-server] match record failed:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[outwit-server] match record error:', err);
    return false;
  }
}
