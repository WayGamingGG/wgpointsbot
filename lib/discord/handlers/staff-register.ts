import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS ?? '').split(',').filter(Boolean);

function hasStaffRole(interaction: any): boolean {
  if (STAFF_ROLE_IDS.length === 0) return true;
  const memberRoles: string[] = interaction.member?.roles ?? [];
  return memberRoles.some((r) => STAFF_ROLE_IDS.includes(r));
}

const GAME_LABEL: Record<string, string> = { lol: 'League of Legends', val: 'Valorant' };
const GAME_COLOR: Record<string, number> = { lol: 0x5b7fff, val: 0xe94b5a };

export async function handleStaffRegister(interaction: any): Promise<NextResponse> {
  if (!hasStaffRole(interaction)) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Não tens permissão para usar este comando.', flags: 64 },
    });
  }

  const options = interaction.data.options ?? [];
  const resolvedUsers = interaction.data.resolved?.users ?? {};

  const jogadorOpt  = options.find((o: any) => o.name === 'jogador');
  const eventoOpt   = options.find((o: any) => o.name === 'evento');
  const jogoOpt     = options.find((o: any) => o.name === 'jogo');

  const targetUserId: string      = jogadorOpt.value;
  const targetUser                = resolvedUsers[targetUserId];
  const targetDisplayName: string = targetUser?.global_name ?? targetUser?.username ?? 'desconhecido';
  const eventoCodigo: string      = eventoOpt.value;
  const game: string              = jogoOpt.value;

  const staffId: string       = interaction.member?.user?.id ?? interaction.user?.id;
  const staffUsername: string = interaction.member?.user?.username ?? interaction.user?.username ?? 'staff';

  const { data: player, error: playerError } = await supabase
    .from('players')
    .upsert(
      { discord_id: targetUserId, nome: targetDisplayName },
      { onConflict: 'discord_id' }
    )
    .select()
    .single();

  if (playerError || !player) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao encontrar jogador. Tenta novamente.', flags: 64 },
    });
  }

  const { data: eventType } = await supabase
    .from('event_types')
    .select()
    .eq('codigo', eventoCodigo)
    .eq('ativo', true)
    .eq('game', game)
    .single();

  if (!eventType) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Tipo de evento não encontrado.', flags: 64 },
    });
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player_id: player.id,
      screenshot_url: '',
      registado_por: `${staffUsername} (${staffId})`,
      status: 'aprovado',
      game,
    })
    .select()
    .single();

  if (matchError || !match) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao registar. Tenta novamente.', flags: 64 },
    });
  }

  await supabase.from('point_events').insert({
    match_id: match.id,
    event_type_id: eventType.id,
    pontos: eventType.pontos,
  });

  const pontos = eventType.pontos;

  const embed = {
    title: `🛡️ Registo Staff — ${GAME_LABEL[game] ?? game}`,
    description: `**Jogador:** <@${targetUserId}> (${targetDisplayName})\n**Evento:** ${eventoCodigo}\n**Pontos:** ${pontos > 0 ? '+' : ''}${pontos} pts\n**Registado por:** <@${staffId}>`,
    color: GAME_COLOR[game] ?? 0x5b7fff,
    footer: { text: `match_id: ${match.id}` },
    timestamp: new Date().toISOString(),
  };

  await fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_VALIDACAO_CHANNEL_ID!}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `✅ **${targetDisplayName}** — ${eventoCodigo} — ${pontos > 0 ? '+' : ''}${pontos} pts aplicados.`,
      flags: 64,
    },
  });
}
