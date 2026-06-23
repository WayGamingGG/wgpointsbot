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

const registerOptions = [
  { name: 'screenshot', description: 'Screenshot da partida como prova',        type: 11, required: true  },
  { name: 'jogador',    description: 'Jogador a registar (vazio = tu próprio)', type: 6,  required: false },
];

const staffRegisterOptions = [
  { name: 'jogador', description: 'Jogador a registar', type: 6, required: true },
  {
    name: 'evento',
    description: 'Evento de treino',
    type: 3,
    required: true,
    choices: [
      { name: 'Participou no Treino', value: 'TREINO' },
      { name: 'Faltou ao Treino',     value: 'FALTA_TREINO' },
    ],
  },
  {
    name: 'jogo',
    description: 'Jogo do treino',
    type: 3,
    required: true,
    choices: [
      { name: 'League of Legends', value: 'lol' },
      { name: 'Valorant',          value: 'val' },
    ],
  },
];

const commands = [
  { name: 'lolregister',   description: 'Registar uma partida de League of Legends',      options: registerOptions      },
  { name: 'lolpoints',     description: 'Ver pontos e estatísticas de LoL de um jogador', options: rankingOptions       },
  { name: 'lolmensal',     description: 'Ranking mensal de pontos de LoL',                options: rankingListOptions   },
  { name: 'lolsemanal',    description: 'Ranking semanal de pontos de LoL',               options: rankingListOptions   },
  { name: 'valregister',   description: 'Registar uma partida de Valorant',               options: registerOptions      },
  { name: 'valpoints',     description: 'Ver pontos e estatísticas de Valorant de um jogador', options: rankingOptions  },
  { name: 'valmensal',     description: 'Ranking mensal de pontos de Valorant',           options: rankingListOptions   },
  { name: 'valsemanal',    description: 'Ranking semanal de pontos de Valorant',          options: rankingListOptions   },
  { name: 'staffregister', description: '[STAFF] Registar presença ou falta de treino',   options: staffRegisterOptions },
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
