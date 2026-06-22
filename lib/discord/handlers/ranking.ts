import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

const PAGE_SIZE = 10;
type RankingPeriod = 'semanal' | 'mensal';
type Game = 'lol' | 'val';

const GAME_LABEL: Record<Game, string> = { lol: 'LoL', val: 'Valorant' };
const GAME_COLOR: Record<Game, number> = { lol: 0x5b7fff, val: 0xe94b5a };

function getDateFilter(period: RankingPeriod): string {
  const now = new Date();
  if (period === 'semanal') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  const d = new Date(now);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

const periodLabel: Record<string, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  geral: 'Geral',
};

export async function handleRanking(
  interaction: any,
  period: RankingPeriod | 'geral',
  game: Game
): Promise<NextResponse> {
  const options = interaction.data.options ?? [];
  const paginaOpt = options.find((o: any) => o.name === 'pagina');
  const page = Math.max(1, paginaOpt?.value ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('point_events')
    .select('pontos, matches!inner(status, criado_em, game, players!inner(discord_id, nome))')
    .eq('matches.status', 'aprovado')
    .eq('matches.game', game);

  if (period !== 'geral') {
    query = query.gte('matches.criado_em', getDateFilter(period));
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro no ranking:', error);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao carregar ranking. Tenta novamente.', flags: 64 },
    });
  }

  const totals: Record<string, { discordId: string; nome: string; pontos: number }> = {};
  for (const row of data ?? []) {
    const match = (row as any).matches;
    const player = match?.players;
    if (!player) continue;
    const key = player.discord_id;
    if (!totals[key]) totals[key] = { discordId: player.discord_id, nome: player.nome, pontos: 0 };
    totals[key].pontos += row.pontos;
  }

  const sorted = Object.values(totals).sort((a, b) => b.pontos - a.pontos);
  const total = sorted.length;
  const paginated = sorted.slice(offset, offset + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (paginated.length === 0) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Ainda não há jogadores com pontos no ranking **${GAME_LABEL[game]} ${periodLabel[period]}**.` },
    });
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = paginated.map((p, i) => {
    const rank = offset + i + 1;
    const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
    return `${medal} <@${p.discordId}> — **${p.pontos}** pts`;
  });

  const embed = {
    title: `🏆 Ranking ${GAME_LABEL[game]} — ${periodLabel[period]}`,
    description: lines.join('\n'),
    color: GAME_COLOR[game],
    footer: { text: `Página ${page} de ${totalPages} · ${total} jogadores` },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
