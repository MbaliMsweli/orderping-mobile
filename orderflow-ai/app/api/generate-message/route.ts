import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { isRateLimited } from '@/lib/rate-limit';
import { corsHeaders } from '@/lib/cors';

if (!process.env.ANTHROPIC_API_KEY)         throw new Error('ANTHROPIC_API_KEY is not set');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL)  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const bodySchema = z.object({
  customerName:        z.string().trim().min(1).max(500),
  status:              z.enum(['received', 'dispatched', 'delay', 'ready', 'pre-order']),
  businessName:        z.string().trim().min(1).max(500),
  tone:                z.enum(['friendly', 'professional', 'apologetic']).default('friendly'),
  orderItems:          z.string().trim().max(500).nullish().transform(v => v || null),
  receivedNote:        z.string().trim().max(500).nullish().transform(v => v || null),
  dispatchDate:        z.string().trim().max(500).nullish().transform(v => v || null),
  courierName:         z.string().trim().max(500).nullish().transform(v => v || null),
  courierDeliveryTime: z.string().trim().max(500).nullish().transform(v => v || null),
  waybillNumber:       z.string().trim().max(500).nullish().transform(v => v || null),
  delayReason:         z.string().trim().max(500).nullish().transform(v => v || null),
  readyNote:           z.string().trim().max(500).nullish().transform(v => v || null),
  preOrderNote:        z.string().trim().max(500).nullish().transform(v => v || null),
  pickupAddress:       z.string().trim().max(500).nullish().transform(v => v || null),
  businessHours:       z.string().trim().max(500).nullish().transform(v => v || null),
  frustrationContext:  z.string().trim().max(300).nullish().transform(v => v || null),
});

const SYSTEM_PROMPT = `Write a WhatsApp/SMS order update from a small business owner to their customer. Return only the message text — nothing else.

Rules:
- Use the customer's first name naturally and warmly
- 30–50 words max
- Lead with reassurance — the customer should feel looked after from the very first word
- If specific items are provided, mention them naturally ("your body butter and serum"). Otherwise say "your order"
- Tone: friendly (warm, conversational, 1–2 emoji) / professional (polished, confident, no emoji) / apologetic (genuinely empathetic, own the situation calmly, reassure them without over-apologising)
- For dispatched orders: lead with the good news ("Your order is on its way!"); mention courier and waybill number if provided; include estimated delivery time; if already dispatched make it feel exciting; if dispatching today or tomorrow give them something to look forward to
- For ready-for-pickup: make it feel like an invitation — include address and hours naturally; use warm language like "all ready and waiting for you"
- For delays: be honest and calm — acknowledge it, give the reason clearly, and reassure them it is still coming. Never sound panicked or over-apologetic
- For received orders: make the customer feel confident their order is in safe, caring hands; confirm receipt warmly
- For pre-orders: make them feel like they made a great choice; set honest timing expectations with warmth and excitement
- Weave in extra context naturally — never list it separately
- Never use phrases like "valued customer", "we appreciate your patience", "please be advised", or "dear customer"
- Sound like a real, caring person texting a neighbour — not a template or a call centre
- End with the business name only — no "Kind regards" or formal sign-offs
- Return ONLY the message text`;

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
  }

  if (await isRateLimited(user.id)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429, headers: corsHeaders(origin) });
  }

  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Invalid request';
      return NextResponse.json({ error: message }, { status: 400, headers: corsHeaders(origin) });
    }

    const {
      customerName, status, businessName, tone, orderItems,
      receivedNote, dispatchDate, courierName, courierDeliveryTime,
      waybillNumber, delayReason, readyNote, preOrderNote,
      pickupAddress, businessHours, frustrationContext,
    } = parsed.data;

    // XML delimiters prevent injected text from escaping its context
    let userPrompt = `<order_update>
Customer: ${customerName}
Status: ${status}
Business: ${businessName}
Tone: ${tone}`;
    if (orderItems)    userPrompt += `\nItems ordered: ${orderItems}`;

    if (status === 'received' && receivedNote) {
      userPrompt += `\nOrder context: ${receivedNote}`;
    }
    if (status === 'dispatched') {
      if (dispatchDate)          userPrompt += `\nDispatch date: ${dispatchDate}`;
      if (courierName)           userPrompt += `\nCourier: ${courierName}`;
      if (courierDeliveryTime)   userPrompt += `\nDelivery time: ${courierDeliveryTime}`;
      if (waybillNumber)         userPrompt += `\nWaybill number: ${waybillNumber}`;
    }
    if (status === 'delay' && delayReason) {
      userPrompt += `\nDelay reason: ${delayReason}`;
    }
    if (status === 'ready') {
      if (pickupAddress) userPrompt += `\nPickup address: ${pickupAddress}`;
      if (businessHours) userPrompt += `\nBusiness hours: ${businessHours}`;
      if (readyNote)     userPrompt += `\nPickup detail: ${readyNote}`;
    }
    if (status === 'pre-order' && preOrderNote) {
      userPrompt += `\nPre-order detail: ${preOrderNote}`;
    }
    if (frustrationContext) {
      userPrompt += `\nCustomer mood context: ${frustrationContext}`;
    }
    userPrompt += '\n</order_update>';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const message = (response.content[0] as { type: string; text: string }).text;
    return NextResponse.json({ message }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error('generate-message error:', (err as Error).message);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: corsHeaders(origin) });
  }
}
