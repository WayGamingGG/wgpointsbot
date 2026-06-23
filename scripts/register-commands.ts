import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.DISCORD_BOT_TOKEN!;
const appId = process.env.DISCORD_APPLICATION_ID!;

const rankingOptions = [
  { name: 'jogador', description: 'Jogador a consultar', type: 6, required: false },
];

const rankingListOptions = [
  { name: 'pagina', description: 'Número da página', type: 4, required: false },
];

const eventChoices = [
  { name: 'MVP — +15 pts',                    value: 'MVP'               },
  { name: 'WIN — +2 pts',                     value: 'WIN'               },
  { name: 'WIN5 — +10 pts (5 vitórias)',       value: 'WIN5'              },
  { name: 'ZERO_DEATH — +10 pts',             value: 'ZERO_DEATH'        },
  { name: 'RANK_UP — +25 pts',                value: 'RANK_UP'           },
  { name: 'PENTAKILL — +20 pts',              value: 'PENTAKILL'         },
  { name: 'S+ — +3 pts',                      value: 'S+'                },
  { name: 'CS_250 — +10 pts',                 value: 'CS_250'            },
  { name: 'OBJ_MENSAL — +15 pts',             value: 'OBJ_MENSAL'        },
  { name: 'KILL_ASSIST_50 — +10 pts',         value: 'KILL_ASSIST_50'    },
  { name: 'FAIR_PLAY — +1 pt',                value: 'FAIR_PLAY'         },
  { name: 'QUADRAKILL — +15 pts',             value: 'QUADRAKILL'        },
  { name: 'TOP_DAMAGE — +10 pts',             value: 'TOP_DAMAGE'        },
  { name: 'HONORS_4 — +10 pts',               value: 'HONORS_4'          },
  { name: 'LOSE — -2 pts',                    value: 'LOSE'              },
  { name: 'FALTA_TREINO — -3 pts',            value: 'FALTA_TREINO'      },
  { name: 'LOSE5 — -10 pts (5 derrotas)',     value: 'LOSE5'             },
  { name: '10_DEATH — -10 pts',               value: '10_DEATH'          },
  { name: 'RANK_DOWN — -25 pts',              value: 'RANK_DOWN'         },
  { name: 'OBJ_MENSAL_FALHOU — -15 pts',      value: 'OBJ_MENSAL_FALHOU' },
  { name: 'OBJ_JUNGLE_0 — -20 pts',           value: 'OBJ_JUNGLE_0'      },
];

const registerOptions = [
  { name: 'screenshot', description: 'Screenshot da partida como prova',       type: 11, required: true,  },
  { name: 'evento1',    description: 'Evento principal',                        type: 3,  required: true,  choices: eventChoices },
  { name: 'evento2',    description: 'Segundo evento (opcional)',                type: 3,  required: false, choices: eventChoices },
  { name: 'evento3',    description: 'Terceiro evento (opcional)',               type: 3,  required: false, choices: eventChoices },
  { name: 'jogador',    description: 'Jogador a registar (vazio = tu próprio)', type: 6,  required: false, },
];

const commands = [
  { name: 'lolregister', description: 'Registar uma partida de LoL (MVP, WIN, PENTAKILL, etc.)', options: registerOptions },
  { name: 'lolpoints', description: 'Ver pontos e estatísticas de LoL de um jogador', options: rankingOptions },
  { name: 'lolmensal', description: 'Ranking mensal de pontos de LoL', options: rankingListOptions },
  { name: 'lolsemanal', description: 'Ranking semanal de pontos de LoL', options: rankingListOptions },
  { name: 'valregister', description: 'Registar uma partida de Valorant (MVP, WIN, PENTAKILL, etc.)', options: registerOptions },
  { name: 'valpoints', description: 'Ver pontos e estatísticas de Valorant de um jogador', options: rankingOptions },
  { name: 'valmensal', description: 'Ranking mensal de pontos de Valorant', options: rankingListOptions },
  { name: 'valsemanal', description: 'Ranking semanal de pontos de Valorant', options: rankingListOptions },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${appId}/commands`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const error = await res.text();
    console.error('Erro ao registar comandos:', error);
    process.exit(1);
  }
  const data = await res.json() as any[];
  console.log(`✓ ${data.length} comandos registados com sucesso`);
}

registerCommands().catch(console.error);
