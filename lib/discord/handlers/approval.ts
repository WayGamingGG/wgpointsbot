import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

const STAFF_ROLE_IDS = (process.env.DISCORD_STAFF_ROLE_IDS ?? '').split(',').filter(Boolean);

function hasStaffRole(interaction: any): boolean {
  if (STAFF_ROLE_IDS.length === 0) return true;
  const memberRoles: string[] = interaction.member?.roles ?? [];
  return memberRoles.some((r) => STAFF_ROLE_IDS.includes(r));
}

async function updateMatchEmbed(interaction: any, matchId: string, approved: boolean): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN!;
  const channelId = interaction.channel_id;
  const messageId = interaction.message.id;
  const reviewerName =
    interaction.member?.user?.global_name ??
    interaction.member?.user?.username ??
    interaction.user?.username ??
    'Staff';

  const { data: match } = await supabase
    .from('matches')
    .select('*, point_events(pontos, event_types(codigo)), players(discord_id, nome)')
    .eq('id', matchId)
    .single();

  const tipo = (match as any)?.point_events?.[0]?.event_types?.codigo ?? 'Evento';
  const pontos = (match as any)?.point_events?.[0]?.pontos ?? 0;
  const playerDiscordId = (match as any)?.players?.discord_id ?? '';

  const statusEmoji = approved ? '✅' : '❌';
  const statusText = approved ? 'APROVADO' : 'REJEITADO';
  const color = approved ? 0x00d4aa : 0xe94b5a;

  const embed = {
    title: `${statusEmoji} Submissão ${statusText} — ${tipo}`,
    description: `**Jogador:** <@${playerDiscordId}>\n**Pontos:** ${approved ? pontos : 0}\n**Revisto por:** ${reviewerName}`,
    color,
    footer: { text: `match_id: ${matchId}` },
    timestamp: new Date().toISOString(),
  };

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed], components: [] }),
  });
}

export async function handleAprovar(interaction: any, matchId: string): Promise<NextResponse> {
  if (!hasStaffRole(interaction)) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Não tens permissão para aprovar submissões.', flags: 64 },
    });
  }

  const { error } = await supabase
    .from('matches')
    .update({ status: 'aprovado' })
    .eq('id', matchId)
    .eq('status', 'pendente');

  if (error) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao aprovar. A submissão já pode ter sido processada.', flags: 64 },
    });
  }

  await updateMatchEmbed(interaction, matchId, true);

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: '✅ Submissão aprovada.', flags: 64 },
  });
}

export async function handleRejeitar(interaction: any, matchId: string): Promise<NextResponse> {
  if (!hasStaffRole(interaction)) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Não tens permissão para rejeitar submissões.', flags: 64 },
    });
  }

  const { error } = await supabase
    .from('matches')
    .update({ status: 'rejeitado' })
    .eq('id', matchId)
    .eq('status', 'pendente');

  if (error) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao rejeitar. A submissão já pode ter sido processada.', flags: 64 },
    });
  }

  await updateMatchEmbed(interaction, matchId, false);

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: '❌ Submissão rejeitada.', flags: 64 },
  });
}
