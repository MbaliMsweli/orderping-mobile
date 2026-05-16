export const metadata = {
  title: 'Privacy Policy — OrderPing',
};

export default function PrivacyPage() {
  const updated = 'May 16, 2025';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#111', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 40, fontSize: 14 }}>OrderPing &mdash; Last updated {updated}</p>

      <Section title="1. Who we are">
        <p>
          OrderPing is a mobile application for small business owners that helps them send professional order update
          messages to customers via WhatsApp, SMS, or Email. OrderPing is operated by Mbali Msweli
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
        </p>
        <p>Contact: <a href="mailto:mbalimsweli.nongalo@gmail.com" style={{ color: '#1A6EF5' }}>mbalimsweli.nongalo@gmail.com</a></p>
      </Section>

      <Section title="2. What information we collect">
        <h3 style={h3}>Account information</h3>
        <p>
          When you create an account we collect your <strong>email address and password</strong>. Passwords are
          hashed and never stored in plain text. Authentication is handled by Supabase.
        </p>

        <h3 style={h3}>Business profile</h3>
        <p>
          During setup you provide your <strong>business name, business phone number, pickup address, and
          business hours</strong>. This is stored in your account so the app can include it in messages
          automatically.
        </p>

        <h3 style={h3}>Customer data you enter</h3>
        <p>
          When you send an order update you enter a <strong>customer name, phone number, and optionally an email
          address</strong>. This data is entered by you and belongs to you. We do not independently collect,
          source, or enrich this data.
        </p>

        <h3 style={h3}>Message history</h3>
        <p>
          The last 30 messages you send are stored <strong>locally on your device</strong> (device storage). A
          copy may also be synced to our secure database for backup purposes. You can clear your history at any
          time from within the app.
        </p>

        <h3 style={h3}>Usage data</h3>
        <p>
          We store a count of messages sent and the date of your last app open locally on your device only. This
          powers features like milestone celebrations and the weekly summary card. It is never sent to our
          servers.
        </p>
      </Section>

      <Section title="3. How we use your information">
        <ul style={{ paddingLeft: 20 }}>
          <li>To authenticate you and secure your account</li>
          <li>To pre-fill your business details into generated messages</li>
          <li>
            To generate order update messages — your business name, customer name, and order status are sent
            to <strong>Anthropic&apos;s AI API</strong> to compose the message text. No payment data or sensitive
            personal details are included
          </li>
          <li>To sync your business profile and message history across devices</li>
          <li>To send order update messages on your behalf via WhatsApp, SMS, or Email — these are opened
          in your device&apos;s native apps; the message content is not transmitted through OrderPing&apos;s servers</li>
        </ul>
      </Section>

      <Section title="4. Third-party services">
        <p>OrderPing uses the following third-party services:</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 700 }}>Service</th>
              <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 700 }}>Purpose</th>
              <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 700 }}>Data shared</th>
            </tr>
          </thead>
          <tbody>
            <Tr service="Supabase" purpose="Authentication and database" data="Email, business profile, message history" />
            <Tr service="Anthropic" purpose="AI message generation" data="Business name, customer name, order status, tone" />
            <Tr service="Vercel" purpose="App hosting (web API)" data="Server request metadata (IP, user agent)" />
            <Tr service="Upstash Redis" purpose="Rate limiting" data="Anonymised user ID only (no personal data)" />
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
          We do not sell your data to any third party. We do not use your data for advertising.
        </p>
      </Section>

      <Section title="5. Data storage and security">
        <ul style={{ paddingLeft: 20 }}>
          <li>All data in transit is encrypted via HTTPS/TLS</li>
          <li>Database access is protected by Row-Level Security — each user can only access their own data</li>
          <li>All API endpoints require authentication; requests without a valid token are rejected</li>
          <li>Rate limiting is enforced to prevent abuse</li>
          <li>Our servers are hosted in South Africa (Vercel Cape Town region, Supabase Africa region)</li>
        </ul>
      </Section>

      <Section title="6. Data retention">
        <p>
          Your account data and business profile are retained for as long as your account is active. Message
          history is capped at the last 30 entries. If you delete your account, all associated data is deleted
          from our database within 30 days.
        </p>
        <p>
          Data stored only on your device (usage stats, draft messages, local message history) is deleted
          immediately when you uninstall the app or clear app data.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>You have the right to:</p>
        <ul style={{ paddingLeft: 20 }}>
          <li><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li><strong>Correction</strong> — update your business profile at any time within the app</li>
          <li><strong>Deletion</strong> — request deletion of your account and all associated data</li>
          <li><strong>Portability</strong> — request your data in a portable format</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href="mailto:mbalimsweli.nongalo@gmail.com" style={{ color: '#1A6EF5' }}>mbalimsweli.nongalo@gmail.com</a>.
          We will respond within 30 days.
        </p>
      </Section>

      <Section title="8. Children's privacy">
        <p>
          OrderPing is intended for business owners and is not directed at children under 13. We do not
          knowingly collect personal information from children under 13. If you believe a child has provided
          us with personal information, please contact us and we will delete it promptly.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this privacy policy from time to time. When we do, we will update the &ldquo;Last
          updated&rdquo; date at the top of this page. Continued use of the app after changes constitutes
          acceptance of the updated policy.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          If you have any questions about this privacy policy or how we handle your data, please contact us at:
        </p>
        <p>
          <strong>Mbali Msweli</strong><br />
          <a href="mailto:mbalimsweli.nongalo@gmail.com" style={{ color: '#1A6EF5' }}>mbalimsweli.nongalo@gmail.com</a>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#111' }}>{title}</h2>
      {children}
    </section>
  );
}

function Tr({ service, purpose, data }: { service: string; purpose: string; data: string }) {
  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '10px 0', fontWeight: 600 }}>{service}</td>
      <td style={{ padding: '10px 0', color: '#444' }}>{purpose}</td>
      <td style={{ padding: '10px 0', color: '#444' }}>{data}</td>
    </tr>
  );
}

const h3: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginTop: 20, marginBottom: 6, color: '#333' };
