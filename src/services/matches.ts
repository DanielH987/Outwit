// Reads online match history for the profile page.
//
// Sources: the Supabase `matches` table (guest ids and account ids both work,
// since seats are text). Returns [] in guest-only mode or on any error so the
// profile always renders local stats regardless.

import { supabase } from '@/services/supabase';
import type { ReplayMove } from '@/engine/replay';

export interface OnlineMatch {
  id: string;
  roomId: string;
  whiteId: string;
  blackId: string;
  whiteName: string | null;
  blackName: string | null;
  winner: 'white' | 'black' | null;
  reason: string;
  moveCount: number;
  finishedAt: string;
  moves: ReplayMove[];
}

const COLUMNS =
  'id, room_id, white_id, black_id, white_name, black_name, winner, reason, move_count, finished_at, moves';

/** Matches where `userId` sat on either side, newest first. */
export async function fetchMatchesFor(userId: string, limit = 20): Promise<OnlineMatch[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('matches')
      .select(COLUMNS)
      .or(`white_id.eq.${userId},black_id.eq.${userId}`)
      .order('finished_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      roomId: row.room_id as string,
      whiteId: row.white_id as string,
      blackId: row.black_id as string,
      whiteName: (row.white_name as string | null) ?? null,
      blackName: (row.black_name as string | null) ?? null,
      winner: (row.winner as 'white' | 'black' | null) ?? null,
      reason: row.reason as string,
      moveCount: (row.move_count as number) ?? 0,
      finishedAt: row.finished_at as string,
      moves: (row.moves as ReplayMove[]) ?? [],
    }));
  } catch (err) {
    console.error('[outwit] failed to load online matches:', err);
    return [];
  }
}
