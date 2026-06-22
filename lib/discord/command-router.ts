import { NextResponse } from 'next/server';
import { handleRegistar } from './handlers/registar';
import { handleRanking } from './handlers/ranking';
import { handlePoints } from './handlers/points';

export async function handleCommand(interaction: any): Promise<NextResponse> {
  const commandName = interaction.data.name;
  switch (commandName) {
    case 'registar': return handleRegistar(interaction);
    case 'geral': return handleRanking(interaction, 'geral');
    case 'semanal': return handleRanking(interaction, 'semanal');
    case 'mensal': return handleRanking(interaction, 'mensal');
    case 'points': return handlePoints(interaction);
    default:
      return NextResponse.json({ type: 4, data: { content: 'Comando desconhecido.', flags: 64 } });
  }
}
