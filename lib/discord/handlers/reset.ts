import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

type Game = 'lol' | 'val';
const GAME_LABEL: Record<Game, string> = { lol: 'League of Legends', val: 'Valorant' };
const GAME_COLOR: Record<Game, number> = { lol: 0x5b7fff, val: 0xe94b5a };

const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS ?? '').split(',').filter(Boolean);

function hasStaffRole(interaction: any): boolean {
  if (STAFF_ROLE_IDS.length === 0) return true;
  const memberRoles: string[] = interaction.member?.roles ?? [];
  return memberRoles.some((r) => STAFF_ROLE_IDS.includes(r));
}

export async function handleReset(interaction: any, game: Game): Promise<NextResponse> {
  if (!hasStaffRole(interaction)) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Não tens permissão para usar este comando.', flags: 64 },
    });
  }

  const options = interaction.data.options ?? [];
  const resolvedUsers = interaction.data.resolved?.users ?? {};
  const jogadorOpt = options.find((o: any) => o.name === 'jogador');
  const confirmarOpt = options.find((o: any) => o.name === 'confirmar');

  const staffId: string = interaction.member?.user?.id ?? interaction.user?.id;

  if (!jogadorOpt) {
    if ((confirmarOpt?.value ?? '').toLowerCase() !== 'sim') {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `⚠️ Vais resetar **todos** os pontos de **${GAME_LABEL[game]}**.\nPara confirmar, adiciona a opção \`confirmar: sim\`.`,
          flags: 64,
        },
      });
    }

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .eq('game', game)
      .eq('status', 'aprovado');

    if (matchesError) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Erro ao carregar partidas. Tenta novamente.', flags: 64 },
      });
    }

    const matchIds = (matches ?? []).map((m: any) => m.id);

    if (matchIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('point_events')
        .delete()
        .in('match_id', matchIds);

      if (deleteError) {
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Erro ao resetar pontos. Tenta novamente.', flags: 64 },
        });
      }
    }

    const embed = {
      title: `🔄 Reset Geral — ${GAME_LABEL[game]}`,
      description: `Todos os pontos de **${GAME_LABEL[game]}** foram resetados.\n**Reset por:** <@${staffId}>`,
      color: GAME_COLOR[game],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { embeds: [embed], flags: 64 },
    });
  }

  const targetUserId: string = jogadorOpt.value;
  const targetUser = resolvedUsers[targetUserId];
  const targetDisplayName = targetUser?.global_name ?? targetUser?.username ?? 'jogador';

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('discord_id', targetUserId)
    .single();

  if (playerError || !player) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Jogador <@${targetUserId}> não encontrado.`, flags: 64 },
    });
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id')
    .eq('player_id', player.id)
    .eq('game', game)
    .eq('status', 'aprovado');

  if (matchesError) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao carregar partidas. Tenta novamente.', flags: 64 },
    });
  }

  const matchIds = (matches ?? []).map((m: any) => m.id);

  if (matchIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('point_events')
      .delete()
      .in('match_id', matchIds);

    if (deleteError) {
      return NextResponse.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: 'Erro ao resetar pontos. Tenta novamente.', flags: 64 },
      });
    }
  }

  const embed = {
    title: `🔄 Reset de Pontos — ${GAME_LABEL[game]}`,
    description: `Pontos de **${targetDisplayName}** (<@${targetUserId}>) em **${GAME_LABEL[game]}** foram resetados.\n**Reset por:** <@${staffId}>`,
    color: GAME_COLOR[game],
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed], flags: 64 },
  });
}
