import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

const PAGE_SIZE = 10;
type RankingPeriod = 'geral' | 'semanal' | 'mensal';

function getDateFilter(period: RankingPeriod): string | null {
  const now = new Date();
  if (period === 'semanal') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (period === 'mensal') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  }
  return null;
}

const periodLabel: Record<RankingPeriod, string> = {
  geral: 'Geral',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

export async function handleRanking(interaction: any, period: RankingPeriod): Promise<NextResponse> {
  const options = interaction.data.options ?? [];
  const paginaOpt = options.find((o: any) => o.name === 'pagina');
  const page = Math.max(1, paginaOpt?.value ?? 1);
  const offset = (page - 1) * PAGE_SIZE;
  const dateFilter = getDateFilter(period);

  let query = supabase
    .from('point_events')
    .select('pontos, matches!inner(status, criado_em, players!inner(discord_id, nome))')
    .eq('matches.status', 'aprovado');

  if (dateFilter) {
    query = query.gte('matches.criado_em', dateFilter);
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
      data: { content: `Ainda não há jogadores com pontos para o ranking **${periodLabel[period]}**.` },
    });
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = paginated.map((p, i) => {
    const rank = offset + i + 1;
    const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
    return `${medal} <@${p.discordId}> — **${p.pontos}** pts`;
  });

  const embed = {
    title: `🏆 Ranking ${periodLabel[period]}`,
    description: lines.join('\n'),
    color: 0xc9a95d,
    footer: { text: `Página ${page} de ${totalPages} · ${total} jogadores` },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
