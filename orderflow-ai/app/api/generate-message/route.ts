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
  businessType:        z.enum(['product', 'service']).default('product'),
  customerName:        z.string().trim().min(1).max(500),
  status:              z.enum([
    // Product
    'received', 'dispatched', 'delay', 'ready', 'pre-order',
    // Service
    'booking-confirmed', 'on-the-way', 'running-late', 'arrived',
    'completed', 'rescheduled', 'waiting-parts', 'follow-up',
  ]),
  businessName:        z.string().trim().min(1).max(500),
  tone:                z.enum(['friendly', 'professional', 'apologetic', 'reassuring']).default('friendly'),
  // Product fields
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
  // Service fields
  appointmentTime:     z.string().trim().max(200).nullish().transform(v => v || null),
  serviceNote:         z.string().trim().max(500).nullish().transform(v => v || null),
  // Shared
  frustrationContext:  z.string().trim().max(300).nullish().transform(v => v || null),
});

const PRODUCT_SYSTEM_PROMPT = `Write a WhatsApp/SMS order update from a small business owner to their customer. Return only the message text — nothing else.

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

const SERVICE_SYSTEM_PROMPT = `Write a WhatsApp/SMS service update from a small business owner to their customer. Return only the message text — nothing else.

Rules:
- Use the customer's first name naturally
- 30–50 words max
- Lead with clarity — the customer should know exactly what's happening from the very first word
- Tone: friendly (warm, conversational, 1–2 emoji) / professional (polished, no emoji) / apologetic (genuinely empathetic, honest, calm — own the situation without over-apologising) / reassuring (calm and confident, puts the customer at ease, 1 emoji max)
- For booking-confirmed: make them feel secure and cared for; mention appointment time if provided; confirm the business is ready
- For on-the-way: be warm and give a clear sense of timing; build anticipation not anxiety
- For running-late: be honest and direct; give a reason; give a revised arrival time if possible; don't over-apologise but do genuinely acknowledge the inconvenience
- For arrived: be direct and energetic; let them know the technician is on site and getting started
- For completed: celebrate the job done warmly; close the loop; invite feedback or further contact if natural
- For rescheduled: be apologetic but professional; confirm new arrangements if given; reassure them you are committed
- For waiting-parts: explain the hold-up briefly and clearly; reassure them you are on top of it and will update them
- For follow-up: be warm and genuine — feel like a real person checking in, not a scripted message
- Appointment time, if provided, should be woven in naturally
- Never use "valued customer", "we appreciate your patience", "please be advised", "dear customer"
- Sound like a real person texting — not a call centre or a template
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
      businessType, customerName, status, businessName, tone, orderItems,
      receivedNote, dispatchDate, courierName, courierDeliveryTime,
      waybillNumber, delayReason, readyNote, preOrderNote,
      pickupAddress, businessHours,
      appointmentTime, serviceNote,
      frustrationContext,
    } = parsed.data;

    const isService = businessType === 'service';

    // XML delimiters prevent injected text from escaping its context
    let userPrompt = `<update>
Customer: ${customerName}
Status: ${status}
Business: ${businessName}
Tone: ${tone}`;

    if (isService) {
      if (appointmentTime) userPrompt += `\nAppointment time: ${appointmentTime}`;
      if (serviceNote)     userPrompt += `\nDetail: ${serviceNote}`;
      if (businessHours)   userPrompt += `\nBusiness hours: ${businessHours}`;
    } else {
      if (orderItems) userPrompt += `\nItems ordered: ${orderItems}`;

      if (status === 'received' && receivedNote) {
        userPrompt += `\nOrder context: ${receivedNote}`;
      }
      if (status === 'dispatched') {
        if (dispatchDate)        userPrompt += `\nDispatch date: ${dispatchDate}`;
        if (courierName)         userPrompt += `\nCourier: ${courierName}`;
        if (courierDeliveryTime) userPrompt += `\nDelivery time: ${courierDeliveryTime}`;
        if (waybillNumber)       userPrompt += `\nWaybill number: ${waybillNumber}`;
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
    }

    if (frustrationContext) {
      userPrompt += `\nCustomer mood context: ${frustrationContext}`;
    }
    userPrompt += '\n</update>';

    const systemPrompt = isService ? SERVICE_SYSTEM_PROMPT : PRODUCT_SYSTEM_PROMPT;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const message = (response.content[0] as { type: string; text: string }).text;
    return NextResponse.json({ message }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error('generate-message error:', (err as Error).message);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers: corsHeaders(origin) });
  }
}
