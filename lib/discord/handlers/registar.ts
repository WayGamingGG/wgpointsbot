import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

type Game = 'lol' | 'val';

const GAME_LABEL: Record<Game, string> = { lol: 'League of Legends', val: 'Valorant' };
const GAME_COLOR: Record<Game, number> = { lol: 0x5b7fff, val: 0xe94b5a };


export async function handleRegister(interaction: any, game: Game): Promise<NextResponse> {
  const options = interaction.data.options ?? [];
  const resolvedUsers = interaction.data.resolved?.users ?? {};
  const resolvedAttachments = interaction.data.resolved?.attachments ?? {};

  const screenshotOpt = options.find((o: any) => o.name === 'screenshot');
  const jogadorOpt = options.find((o: any) => o.name === 'jogador');

  const selectedCodigos = [...new Set(
    ['evento1', 'evento2', 'evento3']
      .map(name => options.find((o: any) => o.name === name)?.value as string | undefined)
      .filter((v): v is string => Boolean(v))
  )];

  const screenshotId: string = screenshotOpt?.value;
  const attachment = resolvedAttachments[screenshotId];
  const screenshotUrl: string = attachment?.url ?? '';

  const registadoPorId: string = interaction.member?.user?.id ?? interaction.user?.id;
  const registadoPorUsername: string =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'desconhecido';

  const targetUserId: string = jogadorOpt ? jogadorOpt.value : registadoPorId;
  const targetUser = resolvedUsers[targetUserId];
  const targetDisplayName: string =
    targetUser?.global_name ?? targetUser?.username ?? registadoPorUsername;

  // Upsert player
  const { data: player, error: playerError } = await supabase
    .from('players')
    .upsert({ discord_id: targetUserId, nome: targetDisplayName }, { onConflict: 'discord_id' })
    .select()
    .single();

  if (playerError || !player) {
    console.error('Erro ao criar jogador:', playerError);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao registar jogador. Tenta novamente.', flags: 64 },
    });
  }

  // Fetch event types for selected tags
  const { data: eventTypes, error: etError } = await supabase
    .from('event_types')
    .select()
    .in('codigo', selectedCodigos)
    .eq('ativo', true);

  if (etError || !eventTypes || eventTypes.length === 0) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Nenhum tipo de evento válido encontrado.', flags: 64 },
    });
  }

  // Create match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player_id: player.id,
      screenshot_url: screenshotUrl,
      registado_por: `${registadoPorUsername} (${registadoPorId})`,
      status: 'pendente',
      game,
    })
    .select()
    .single();

  if (matchError || !match) {
    console.error('Erro ao criar match:', matchError);
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao registar partida. Tenta novamente.', flags: 64 },
    });
  }

  // Create one point_event per selected tag
  const pointEventsToInsert = eventTypes.map(et => ({
    match_id: match.id,
    event_type_id: et.id,
    pontos: et.pontos,
  }));

  await supabase.from('point_events').insert(pointEventsToInsert);

  const totalPontos = eventTypes.reduce((acc, et) => acc + et.pontos, 0);
  const tagsLabel = eventTypes.map(et => `${et.codigo} (${et.pontos}pts)`).join(' + ');

  // Post to validation channel
  const channelId = process.env.DISCORD_VALIDACAO_CHANNEL_ID!;
  const botToken = process.env.DISCORD_BOT_TOKEN!;

  const embed = {
    title: `Nova submissão — ${GAME_LABEL[game]}`,
    description: `**Jogador:** <@${targetUserId}> (${targetDisplayName})\n**Registado por:** <@${registadoPorId}>\n**Eventos:** ${tagsLabel}\n**Total:** ${totalPontos} pts`,
    image: screenshotUrl ? { url: screenshotUrl } : undefined,
    color: GAME_COLOR[game],
    footer: { text: `match_id: ${match.id}` },
    timestamp: new Date().toISOString(),
  };

  const components = [{
    type: 1,
    components: [
      { type: 2, style: 3, label: '✅ Aprovar', custom_id: `aprovar:${match.id}` },
      { type: 2, style: 4, label: '❌ Rejeitar', custom_id: `rejeitar:${match.id}` },
    ],
  }];

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], components }),
  });

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Submissão enviada para aprovação! **${GAME_LABEL[game]}** — ${tagsLabel} = **${totalPontos} pts** pendentes de validação.`,
      flags: 64,
    },
  });
}
