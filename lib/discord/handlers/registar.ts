import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

type Game = 'lol' | 'val';

const GAME_LABEL: Record<Game, string> = { lol: 'League of Legends', val: 'Valorant' };

const EVENT_SELECT_OPTIONS = [
  { label: 'MVP',               value: 'MVP'               },
  { label: 'WIN',               value: 'WIN'               },
  { label: 'WIN5',              value: 'WIN5'              },
  { label: 'ZERO_DEATH',        value: 'ZERO_DEATH'        },
  { label: 'RANK_UP',           value: 'RANK_UP'           },
  { label: 'PENTAKILL',         value: 'PENTAKILL'         },
  { label: 'S+',                value: 'S+'                },
  { label: 'CS_250',            value: 'CS_250'            },
  { label: 'OBJ_MENSAL',        value: 'OBJ_MENSAL'        },
  { label: 'KILL_ASSIST_50',    value: 'KILL_ASSIST_50'    },
  { label: 'FAIR_PLAY',         value: 'FAIR_PLAY'         },
  { label: 'QUADRAKILL',        value: 'QUADRAKILL'        },
  { label: 'TOP_DAMAGE',        value: 'TOP_DAMAGE'        },
  { label: 'HONORS_4',          value: 'HONORS_4'          },
  { label: 'LOSE',              value: 'LOSE'              },
  { label: 'FALTA_TREINO',      value: 'FALTA_TREINO'      },
  { label: 'LOSE5',             value: 'LOSE5'             },
  { label: '10_DEATH',          value: '10_DEATH'          },
  { label: 'RANK_DOWN',         value: 'RANK_DOWN'         },
  { label: 'OBJ_MENSAL_FALHOU', value: 'OBJ_MENSAL_FALHOU' },
  { label: 'OBJ_JUNGLE_0',      value: 'OBJ_JUNGLE_0'      },
];

export async function handleRegister(interaction: any, game: Game): Promise<NextResponse> {
  const options = interaction.data.options ?? [];
  const resolvedUsers = interaction.data.resolved?.users ?? {};
  const resolvedAttachments = interaction.data.resolved?.attachments ?? {};

  const screenshotOpt = options.find((o: any) => o.name === 'screenshot');
  const jogadorOpt = options.find((o: any) => o.name === 'jogador');

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

  const { data: pending, error } = await supabase
    .from('pending_submissions')
    .insert({
      screenshot_url: screenshotUrl,
      target_user_id: targetUserId,
      target_display_name: targetDisplayName,
      registered_by_id: registadoPorId,
      registered_by_username: registadoPorUsername,
      game,
    })
    .select()
    .single();

  if (error || !pending) {
    return NextResponse.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: 'Erro ao iniciar registo. Tenta novamente.', flags: 64 },
    });
  }

  return NextResponse.json({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `**${GAME_LABEL[game]}** — Seleciona os eventos da partida:`,
      flags: 64,
      components: [{
        type: 1,
        components: [{
          type: 3,
          custom_id: `events:${pending.id}`,
          options: EVENT_SELECT_OPTIONS,
          placeholder: 'Seleciona os eventos (podes escolher vários)',
          min_values: 1,
          max_values: 21,
        }],
      }],
    },
  });
}
