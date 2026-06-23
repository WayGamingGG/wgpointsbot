import { NextResponse } from 'next/server';
import { handleAprovar, handleRejeitar } from './handlers/approval';
import { handleSelectEvents } from './handlers/select-events';

export async function handleComponent(interaction: any): Promise<NextResponse> {
  const customId: string = interaction.data.custom_id;
  if (customId.startsWith('aprovar:')) return handleAprovar(interaction, customId.split(':')[1]);
  if (customId.startsWith('rejeitar:')) return handleRejeitar(interaction, customId.split(':')[1]);
  if (customId.startsWith('events:')) return handleSelectEvents(interaction, customId.split(':')[1]);
  return NextResponse.json({ type: 4, data: { content: 'Ação desconhecida.', flags: 64 } });
}
