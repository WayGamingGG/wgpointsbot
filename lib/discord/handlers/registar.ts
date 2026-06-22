import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

export async function handleRegistar(interaction: any): Promise<NextResponse> {
  const options = interaction.data.options ?? [];
  const resolvedUsers = interaction.data.resolved?.users ?? {};
  const resolvedAttachments = interaction.data.resolved?.attachments ?? {};

  const tipoOpt = options.find((o: any) => o.name === 'tipo');
  const screenshotOpt = options.find((o: any) => o.name === 'screenshot');
  const jogadorOpt = options.find((o: any) => o.name === 'jogador');

  const tipo: string = tipoOpt?.value;
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

  const { data: eventType, error: eventTypeError } = await supabase
    .from('event_types')
    .select()
    .eq('codigo', tipo)
    .eq('ativo', true)
    .single();

  if (eventTypeError || !eventType) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `Tipo de evento "${tipo}" não encontrado.`, flags: 64 },
    });
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player_id: player.id,
      screenshot_url: screenshotUrl,
      registado_por: `${registadoPorUsername} (${registadoPorId})`,
      status: 'pendente',
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

  await supabase.from('point_events').insert({
    match_id: match.id,
    event_type_id: eventType.id,
    pontos: eventType.pontos,
  });

  const channelId = process.env.DISCORD_VALIDACAO_CHANNEL_ID!;
  const botToken = process.env.DISCORD_BOT_TOKEN!;

  const embed = {
    title: `Nova submissão — ${tipo}`,
    description: `**Jogador:** <@${targetUserId}> (${targetDisplayName})\n**Registado por:** <@${registadoPorId}>\n**Pontos:** ${eventType.pontos}`,
    image: screenshotUrl ? { url: screenshotUrl } : undefined,
    color: tipo === 'MVP' ? 0xc9a95d : 0x00d4aa,
    footer: { text: `match_id: ${match.id}` },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: '✅ Aprovar', custom_id: `aprovar:${match.id}` },
        { type: 2, style: 4, label: '❌ Rejeitar', custom_id: `rejeitar:${match.id}` },
      ],
    },
  ];

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], components }),
  });

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Submissão enviada para aprovação! O teu **${tipo}** (${eventType.pontos} pontos) está pendente de validação.`,
      flags: 64,
    },
  });
}
