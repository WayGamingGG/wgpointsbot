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
  { name: 'screenshot',         description: 'Screenshot da partida como prova',           type: 11, required: true  },
  { name: 'mvp',                description: 'MVP da partida (+15 pts)',                    type: 5,  required: false },
  { name: 'win',                description: 'Vitória (+2 pts)',                            type: 5,  required: false },
  { name: 'win5',               description: '5 vitórias seguidas (+10 pts)',               type: 5,  required: false },
  { name: 'zero_death',         description: 'Zero mortes na partida (+10 pts)',             type: 5,  required: false },
  { name: 'rank_up',            description: 'Subida de rank (+25 pts)',                    type: 5,  required: false },
  { name: 'pentakill',          description: 'Pentakill (+20 pts)',                         type: 5,  required: false },
  { name: 's_mais',             description: 'Nota S+ (+3 pts)',                            type: 5,  required: false },
  { name: 'cs_250',             description: '250+ CS na partida (+10 pts)',                type: 5,  required: false },
  { name: 'obj_mensal',         description: 'Objetivo mensal cumprido (+15 pts)',          type: 5,  required: false },
  { name: 'kill_assist_50',     description: '50+ kills/assistências (+10 pts)',            type: 5,  required: false },
  { name: 'fair_play',          description: 'Fair Play (+1 pt)',                           type: 5,  required: false },
  { name: 'quadrakill',         description: 'Quadrakill (+15 pts)',                        type: 5,  required: false },
  { name: 'top_damage',         description: 'Top damage da equipa (+10 pts)',              type: 5,  required: false },
  { name: 'honors_4',           description: '4 honors recebidos (+10 pts)',                type: 5,  required: false },
  { name: 'lose',               description: 'Derrota (-2 pts)',                            type: 5,  required: false },
  { name: 'falta_treino',       description: 'Falta ao treino (-3 pts)',                    type: 5,  required: false },
  { name: 'lose5',              description: '5 derrotas seguidas (-10 pts)',               type: 5,  required: false },
  { name: 'death_10',           description: '10+ mortes na partida (-10 pts)',             type: 5,  required: false },
  { name: 'rank_down',          description: 'Descida de rank (-25 pts)',                   type: 5,  required: false },
  { name: 'obj_mensal_falhou',  description: 'Objetivo mensal falhado (-15 pts)',           type: 5,  required: false },
  { name: 'obj_jungle_0',       description: '0 objetivos de jungle (-20 pts)',             type: 5,  required: false },
  { name: 'jogador',            description: 'Jogador a registar (vazio = tu próprio)',     type: 6,  required: false },
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
