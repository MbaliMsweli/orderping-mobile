import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { log, logException } from '@/lib/logger';

// Called by Vercel Cron (vercel.json) every minute.
// Authorization is via CRON_SECRET — set this in Vercel env vars.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('notification_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .limit(50);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    log('info', 'worker_run', { jobCount: jobs.length });

    let processed = 0;
    for (const job of jobs) {
      await processJob(job);
      processed++;
    }

    return NextResponse.json({ processed });
  } catch (err) {
    logException(err, { endpoint: 'worker/process-jobs' });
    return NextResponse.json({ error: 'Worker failed' }, { status: 500 });
  }
}

type JobRow = {
  id:             string;
  user_id:        string;
  channel:        'whatsapp' | 'sms' | 'email';
  recipient_phone: string | null;
  recipient_email: string | null;
  message:        string;
  subject:        string | null;
  attempts:       number;
  max_attempts:   number;
};

async function processJob(job: JobRow): Promise<void> {
  await supabaseAdmin
    .from('notification_jobs')
    .update({ status: 'processing' })
    .eq('id', job.id);

  try {
    // Delivery provider calls go here when a provider is configured.
    // Example: await sendViaTwilio(job), await sendViaResend(job)
    throw new Error('No delivery provider configured');
  } catch (err) {
    const attempts = job.attempts + 1;
    const isDead = attempts >= job.max_attempts;
    const backoffSeconds = [60, 300, 900][attempts - 1] ?? 900;

    await supabaseAdmin
      .from('notification_jobs')
      .update({
        status:        isDead ? 'dead' : 'pending',
        attempts,
        last_error:    (err as Error).message,
        scheduled_for: new Date(Date.now() + backoffSeconds * 1000).toISOString(),
      })
      .eq('id', job.id);

    log('warn', 'job_failed', {
      jobId:    job.id,
      attempts,
      channel:  job.channel,
      isDead,
    });
  }
}
