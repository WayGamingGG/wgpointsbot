import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

type Game = 'lol' | 'val';
const GAME_LABEL: Record<Game, string> = { lol: 'League of Legends', val: 'Valorant' };
const GAME_COLOR: Record<Game, number> = { lol: 0x5b7fff, val: 0xe94b5a };

export async function handlePoints(interaction: any, game: Game): Promise<NextResponse> {
  const options = interaction.data.options ?? [];
  const jogadorOpt = options.find((o: any) => o.name === 'jogador');
  const resolvedUsers = interaction.data.resolved?.users ?? {};

  const selfId: string = interaction.member?.user?.id ?? interaction.user?.id;
  const targetId: string = jogadorOpt ? jogadorOpt.value : selfId;
  const targetUser = resolvedUsers[targetId];
  const targetDisplayName =
    targetUser?.global_name ?? targetUser?.username ?? (targetId === selfId ? 'ti' : 'esse jogador');

  const { data: player } = await supabase
    .from('players')
    .select('id, nome, discord_id')
    .eq('discord_id', targetId)
    .single();

  if (!player) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Jogador <@${targetId}> ainda não tem pontos de ${GAME_LABEL[game]} registados.`, flags: 64 },
    });
  }

  const { data: events } = await supabase
    .from('point_events')
    .select('pontos, criado_em, event_types(codigo), matches!inner(status, player_id, game)')
    .eq('matches.status', 'aprovado')
    .eq('matches.player_id', player.id)
    .eq('matches.game', game)
    .order('criado_em', { ascending: false });

  const totalPontos = (events ?? []).reduce((acc, e) => acc + e.pontos, 0);
  const totalEvents = (events ?? []).length;
  const media = totalEvents > 0 ? (totalPontos / totalEvents).toFixed(1) : '0.0';

  const ultimos5 = (events ?? []).slice(0, 5);
  const ultimosLines = ultimos5.map((e) => {
    const codigo = (e as any).event_types?.codigo ?? '?';
    const data = new Date(e.criado_em).toLocaleDateString('pt-PT');
    return `• **${codigo}** — ${e.pontos} pts — ${data}`;
  });

  const embed = {
    title: `📊 ${GAME_LABEL[game]} — Pontos de ${player.nome}`,
    description: [
      `**Total:** ${totalPontos} pts`,
      `**Eventos aprovados:** ${totalEvents}`,
      `**Média por evento:** ${media} pts`,
      '',
      ultimos5.length > 0
        ? `**Últimos registos:**\n${ultimosLines.join('\n')}`
        : '_Nenhum registo recente._',
    ].join('\n'),
    color: GAME_COLOR[game],
    footer: { text: `discord_id: ${player.discord_id}` },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] },
  });
}
