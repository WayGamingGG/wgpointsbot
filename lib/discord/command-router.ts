import { NextResponse } from 'next/server';
import { handleRegister } from './handlers/registar';
import { handleRanking } from './handlers/ranking';
import { handlePoints } from './handlers/points';
import { handleStaffRegister } from './handlers/staff-register';

export async function handleCommand(interaction: any): Promise<NextResponse> {
  const name = interaction.data.name;
  switch (name) {
    case 'lolregister':   return handleRegister(interaction, 'lol');
    case 'valregister':   return handleRegister(interaction, 'val');
    case 'staffregister': return handleStaffRegister(interaction);
    case 'lolpoints':     return handlePoints(interaction, 'lol');
    case 'valpoints':     return handlePoints(interaction, 'val');
    case 'lolmensal':     return handleRanking(interaction, 'mensal', 'lol');
    case 'lolsemanal':    return handleRanking(interaction, 'semanal', 'lol');
    case 'valmensal':     return handleRanking(interaction, 'mensal', 'val');
    case 'valsemanal':    return handleRanking(interaction, 'semanal', 'val');
    default:
      return NextResponse.json({ type: 4, data: { content: 'Comando desconhecido.', flags: 64 } });
  }
}
