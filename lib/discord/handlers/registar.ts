import { NextResponse } from 'next/server';
import { InteractionResponseType } from 'discord-interactions';
import { supabase } from '@/lib/supabase/client';

type Game = 'lol' | 'val';

const GAME_LABEL: Record<Game, string> = { lol: 'League of Legends', val: 'Valorant' };

const EVENT_SELECT_OPTIONS_LOL = [
  { label: '5 Vitórias',                   value: 'WIN5'                    },
  { label: '0 Mortes',                     value: 'ZERO_DEATH'              },
  { label: '0 Mortes (SCRIM)',             value: 'ZERO_DEATH_SCRIM'        },
  { label: 'Subir de Rank',               value: 'RANK_UP'                 },
  { label: 'Pentakill',                   value: 'PENTAKILL'               },
  { label: 'Pentakill (SCRIM)',            value: 'PENTAKILL_SCRIM'         },
  { label: 'Quadrakill',                  value: 'QUADRAKILL'              },
  { label: 'Quadrakill (SCRIM)',           value: 'QUADRAKILL_SCRIM'        },
  { label: 'S+ Solo/Equipa',              value: 'S_PLUS'                  },
  { label: 'Objetivo Jungle Equipa',      value: 'OBJ_JUNGLE'              },
  { label: '250 CS',                      value: 'CS_250'                  },
  { label: 'Objetivo Mensal',             value: 'OBJ_MENSAL'              },
  { label: 'Kill/Assist Supp',            value: 'KILL_ASSIST_SUPP'        },
  { label: 'Kill/Assist Supp (SCRIM)',    value: 'KILL_ASSIST_SUPP_SCRIM'  },
  { label: 'Kill/Assist Jungle',          value: 'KILL_ASSIST_JUNGLE'      },
  { label: 'Kill/Assist Jungle (SCRIM)',  value: 'KILL_ASSIST_JUNGLE_SCRIM'},
  { label: 'Top Damage',                  value: 'TOP_DAMAGE'              },
  { label: 'Top Damage (SCRIM)',          value: 'TOP_DAMAGE_SCRIM'        },
  { label: '4 Honors',                    value: 'HONORS_4'                },
  { label: '5 Derrotas',                  value: 'LOSE5'                   },
  { label: '10 Mortes',                   value: 'DEATH_10'                },
  { label: 'Descer de Rank',              value: 'RANK_DOWN'               },
  { label: 'Obj. Mensal Não Atingido',    value: 'OBJ_MENSAL_FALHOU'       },
  { label: '0 Obj. Jungle (SCRIM)',       value: 'OBJ_JUNGLE_0_SCRIM'      },
  { label: '0 Objetivo Jungle',           value: 'OBJ_JUNGLE_0'            },
];

const EVENT_SELECT_OPTIONS_VAL = [
  { label: '5 Vitórias',                  value: 'WIN5'             },
  { label: 'MVP Solo/Equipa',             value: 'MVP'              },
  { label: 'Subir de Rank',              value: 'RANK_UP'          },
  { label: 'Subir de Divisão',           value: 'DIV_UP'           },
  { label: 'ACE',                         value: 'ACE'              },
  { label: 'Objetivo Mensal',            value: 'OBJ_MENSAL'       },
  { label: '10 Assistências',            value: 'ASSIST_10'        },
  { label: 'Boost Servidor',             value: 'BOOST_SERVER'     },
  { label: 'MVP (SCRIM)',                 value: 'MVP_SCRIM'        },
  { label: 'ACE (SCRIM)',                 value: 'ACE_SCRIM'        },
  { label: '10 Assistências (SCRIM)',    value: 'ASSIST_10_SCRIM'  },
  { label: '5 Derrotas',                 value: 'LOSE5'            },
  { label: 'Descer de Divisão',          value: 'DIV_DOWN'         },
  { label: 'Descer de Rank',             value: 'RANK_DOWN'        },
  { label: 'Obj. Mensal Não Atingido',   value: 'OBJ_MENSAL_FALHOU'},
];

const EVENT_OPTIONS: Record<Game, { label: string; value: string }[]> = {
  lol: EVENT_SELECT_OPTIONS_LOL,
  val: EVENT_SELECT_OPTIONS_VAL,
};

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

  const selectOptions = EVENT_OPTIONS[game];

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
          options: selectOptions,
          placeholder: 'Seleciona os eventos (podes escolher vários)',
          min_values: 1,
          max_values: selectOptions.length,
        }],
      }],
    },
  });
}
