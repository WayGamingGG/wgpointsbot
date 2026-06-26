import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const GAME_LABEL: Record<string, string> = { lol: 'League of Legends', val: 'Valorant' };
const GAME_COLOR: Record<string, number> = { lol: 0x5b7fff, val: 0xe94b5a };

export async function handleSelectEvents(interaction: any, pendingId: string): Promise<NextResponse> {
  const selectedCodigos: string[] = interaction.data.values ?? [];

  const { data: pending } = await supabase
    .from('pending_submissions')
    .select()
    .eq('id', pendingId)
    .single();

  if (!pending) {
    return NextResponse.json({
      type: 7,
      data: { content: 'Sessão expirada. Usa o comando novamente.', components: [] },
    });
  }

  const game: string = pending.game;

  const [playerResult, eventTypesResult] = await Promise.all([
    supabase
      .from('players')
      .upsert(
        { discord_id: pending.target_user_id, nome: pending.target_display_name },
        { onConflict: 'discord_id' }
      )
      .select()
      .single(),
    supabase
      .from('event_types')
      .select()
      .in('codigo', selectedCodigos)
      .eq('ativo', true)
      .eq('game', game),
  ]);

  if (playerResult.error || !playerResult.data) {
    return NextResponse.json({
      type: 7,
      data: { content: 'Erro ao registar jogador. Tenta novamente.', components: [] },
    });
  }

  if (eventTypesResult.error || !eventTypesResult.data?.length) {
    return NextResponse.json({
      type: 7,
      data: { content: 'Nenhum tipo de evento válido encontrado.', components: [] },
    });
  }

  const player = playerResult.data;
  const eventTypes = eventTypesResult.data;

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      player_id: player.id,
      screenshot_url: pending.screenshot_url,
      registado_por: `${pending.registered_by_username} (${pending.registered_by_id})`,
      status: 'pendente',
      game,
    })
    .select()
    .single();

  if (matchError || !match) {
    return NextResponse.json({
      type: 7,
      data: { content: 'Erro ao registar partida. Tenta novamente.', components: [] },
    });
  }

  await Promise.all([
    supabase.from('point_events').insert(
      eventTypes.map(et => ({ match_id: match.id, event_type_id: et.id, pontos: et.pontos }))
    ),
    supabase.from('pending_submissions').delete().eq('id', pendingId),
  ]);

  const totalPontos = eventTypes.reduce((acc, et) => acc + et.pontos, 0);
  const tagsLabel = eventTypes.map(et => et.codigo).join(', ');

  const embed = {
    title: `Nova submissão — ${GAME_LABEL[game] ?? game}`,
    description: `**Jogador:** <@${pending.target_user_id}> (${pending.target_display_name})\n**Registado por:** <@${pending.registered_by_id}>\n**Eventos:** ${tagsLabel}\n**Total:** ${totalPontos > 0 ? '+' : ''}${totalPontos} pts`,
    image: pending.screenshot_url ? { url: pending.screenshot_url } : undefined,
    color: GAME_COLOR[game] ?? 0x5b7fff,
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

  await fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_VALIDACAO_CHANNEL_ID!}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embeds: [embed], components }),
  });

  return NextResponse.json({
    type: 7,
    data: {
      content: `✅ Submissão enviada para aprovação! **${GAME_LABEL[game] ?? game}** — ${tagsLabel} — pendente de validação.`,
      components: [],
    },
  });
}
