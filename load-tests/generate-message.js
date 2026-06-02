/**
 * k6 load test for /api/generate-message
 *
 * Run:
 *   k6 run --env BASE_URL=https://www.orderping.net --env SUPABASE_TOKEN=xxx load-tests/generate-message.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10  },   // ramp to 10 VUs
    { duration: '1m',  target: 50  },   // ramp to 50 VUs
    { duration: '2m',  target: 50  },   // hold at 50 VUs
    { duration: '30s', target: 200 },   // spike to 200 VUs
    { duration: '1m',  target: 200 },   // hold spike
    { duration: '30s', target: 0   },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // 95% of requests under 5s (AI calls are slow)
    http_req_failed:   ['rate<0.02'],   // less than 2% hard failures
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://www.orderping.net';
const TOKEN    = __ENV.SUPABASE_TOKEN;

const STATUSES = ['received', 'dispatched', 'delay', 'ready', 'pre-order'];
const TONES    = ['friendly', 'professional', 'apologetic'];

export default function () {
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const tone   = TONES[Math.floor(Math.random() * TONES.length)];

  const payload = JSON.stringify({
    customerName:        'Thandi',
    status,
    tone,
    businessName:        'Test Business',
    businessDescription: 'We sell handmade skincare products online and at markets.',
    businessType:        'product',
    receivedNote:        null,
    dispatchDate:        null,
    courierName:         status === 'dispatched' ? 'The Courier Guy' : null,
    courierDeliveryTime: status === 'dispatched' ? '3-5 working days' : null,
    waybillNumber:       null,
    courierMessage:      null,
    delayReason:         status === 'delay' ? '1 delay update' : null,
    readyNote:           null,
    preOrderNote:        null,
    serviceNote:         null,
    appointmentTime:     null,
    orderItems:          null,
    pickupAddress:       null,
    businessHours:       null,
    frustrationContext:  null,
  });

  const res = http.post(
    `${BASE_URL}/api/generate-message`,
    payload,
    {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      timeout: '30s',
    }
  );

  check(res, {
    'status 200':          (r) => r.status === 200,
    'has message field':   (r) => {
      try { return JSON.parse(r.body).message?.length > 0; }
      catch { return false; }
    },
    'not rate limited':    (r) => r.status !== 429,
    'under 5s':            (r) => r.timings.duration < 5000,
  });

  sleep(1);
}
