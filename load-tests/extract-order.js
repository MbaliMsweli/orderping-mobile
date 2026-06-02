/**
 * k6 load test for /api/extract-order
 *
 * Run:
 *   k6 run --env BASE_URL=https://www.orderping.net --env SUPABASE_TOKEN=xxx load-tests/extract-order.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10  },
    { duration: '1m',  target: 50  },
    { duration: '2m',  target: 50  },
    { duration: '30s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<4000'],
    http_req_failed:   ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://www.orderping.net';
const TOKEN    = __ENV.SUPABASE_TOKEN;

const SAMPLE_ORDERS = [
  'Order #1234 — Thandi Dlamini, 0821234567, thandi@gmail.com. Items: 2x Rose Hip Oil, 1x Shea Butter. Notes: Please gift wrap.',
  'New order from Sipho Nkosi (0839876543). Ordered: African Black Soap x3. Delivery to 14 Oak Street Johannesburg.',
  'Customer: Nomvula Mthembu | Phone: 0711112222 | Email: nomvula@outlook.com | Product: Vitamin C serum x1',
];

export default function () {
  const orderText = SAMPLE_ORDERS[Math.floor(Math.random() * SAMPLE_ORDERS.length)];

  const res = http.post(
    `${BASE_URL}/api/extract-order`,
    JSON.stringify({ orderText }),
    {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      timeout: '20s',
    }
  );

  check(res, {
    'status 200':        (r) => r.status === 200,
    'has name field':    (r) => {
      try { return typeof JSON.parse(r.body).name === 'string'; }
      catch { return false; }
    },
    'not rate limited':  (r) => r.status !== 429,
    'under 4s':          (r) => r.timings.duration < 4000,
  });

  sleep(1);
}
