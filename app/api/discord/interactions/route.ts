import { NextRequest, NextResponse } from 'next/server';
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import { handleCommand } from '@/lib/discord/command-router';
import { handleComponent } from '@/lib/discord/component-router';

export const runtime = 'nodejs';

async function verifyRequest(req: NextRequest): Promise<{ valid: boolean; body: string }> {
  const signature = req.headers.get('x-signature-ed25519') ?? '';
  const timestamp = req.headers.get('x-signature-timestamp') ?? '';
  const body = await req.text();

  try {
    const publicKeyRaw = Buffer.from(process.env.DISCORD_PUBLIC_KEY!, 'hex');
    const signatureRaw = Buffer.from(signature, 'hex');
    const message = Buffer.from(timestamp + body);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      publicKeyRaw,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify('Ed25519', cryptoKey, signatureRaw, message);
    return { valid, body };
  } catch {
    return { valid: false, body };
  }
}

export async function POST(req: NextRequest) {
  const { valid, body } = await verifyRequest(req);
  if (!valid) return new NextResponse('Invalid request signature', { status: 401 });

  const interaction = JSON.parse(body);

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    return handleCommand(interaction);
  }
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    return handleComponent(interaction);
  }

  return new NextResponse('Unknown interaction type', { status: 400 });
}
