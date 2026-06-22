import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const token = process.env.DISCORD_BOT_TOKEN!;
const appId = process.env.DISCORD_APPLICATION_ID!;

const commands = [
  {
    name: 'registar',
    description: 'Registar uma partida com screenshot para aprovação',
    options: [
      {
        name: 'tipo',
        description: 'Tipo de evento (MVP ou ACE)',
        type: 3,
        required: true,
        choices: [
          { name: 'MVP', value: 'MVP' },
          { name: 'ACE', value: 'ACE' },
        ],
      },
      {
        name: 'screenshot',
        description: 'Screenshot da partida como prova',
        type: 11,
        required: true,
      },
      {
        name: 'jogador',
        description: 'Jogador a registar (deixa vazio para te registares a ti próprio)',
        type: 6,
        required: false,
      },
    ],
  },
  {
    name: 'geral',
    description: 'Ranking geral de pontos',
    options: [
      { name: 'pagina', description: 'Número da página', type: 4, required: false },
    ],
  },
  {
    name: 'semanal',
    description: 'Ranking semanal de pontos',
    options: [
      { name: 'pagina', description: 'Número da página', type: 4, required: false },
    ],
  },
  {
    name: 'mensal',
    description: 'Ranking mensal de pontos',
    options: [
      { name: 'pagina', description: 'Número da página', type: 4, required: false },
    ],
  },
  {
    name: 'points',
    description: 'Ver os teus pontos e estatísticas',
    options: [
      {
        name: 'jogador',
        description: 'Jogador a consultar (deixa vazio para te consultares a ti próprio)',
        type: 6,
        required: false,
      },
    ],
  },
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
