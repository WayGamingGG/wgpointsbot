import { NextResponse } from 'next/server';
import { handleRegister } from './handlers/registar';
import { handleRanking } from './handlers/ranking';
import { handlePoints } from './handlers/points';
import { handleStaffRegister } from './handlers/staff-register';
import { handleReset } from './handlers/reset';

export async function handleCommand(interaction: any): Promise<NextResponse> {
  const name = interaction.data.name;
  switch (name) {
    case 'lolregister':     return handleRegister(interaction, 'lol');
    case 'valregister':     return handleRegister(interaction, 'val');
    case 'staffregister':   return handleStaffRegister(interaction);
    case 'lolpoints':       return handlePoints(interaction, 'lol');
    case 'valpoints':       return handlePoints(interaction, 'val');
    case 'stafflolmensal':  return handleRanking(interaction, 'mensal', 'lol');
    case 'stafflolsemanal': return handleRanking(interaction, 'semanal', 'lol');
    case 'stafflolreset':   return handleReset(interaction, 'lol');
    case 'staffvalmensal':  return handleRanking(interaction, 'mensal', 'val');
    case 'staffvalsemanal': return handleRanking(interaction, 'semanal', 'val');
    case 'staffvalreset':   return handleReset(interaction, 'val');
    default:
      return NextResponse.json({ type: 4, data: { content: 'Comando desconhecido.', flags: 64 } });
  }
}
