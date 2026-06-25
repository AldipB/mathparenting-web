// src/app/privacy/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | MathParenting",
  description: "How MathParenting handles your data. Your chat history stays on your device; we store only your email, name, and subscription status.",
};

const UPDATED = "June 25, 2026";

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Nunito:wght@400;600;700;800&display=swap');
        .legal-page {
          --cream: #FDFAF4; --teal: #1A8A8A; --teal-dark: #0D5F5F;
          --teal-light: #E0F4F4; --ink: #1C1008; --ink-soft: #3D2E22; --ink-muted: #8C7B6B;
          background: var(--cream);
          font-family: 'Nunito', sans-serif;
          color: var(--ink-soft);
          min-height: 100vh;
          padding: 56px 20px 80px;
        }
        .legal-wrap { max-width: 760px; margin: 0 auto; }
        .legal-page h1 {
          font-family: 'Playfair Display', serif;
          font-weight: 900;
          font-size: clamp(2rem, 4vw, 2.8rem);
          color: var(--ink);
          line-height: 1.15;
          margin: 0 0 8px;
        }
        .legal-updated { color: var(--ink-muted); font-size: 0.9rem; font-weight: 700; margin-bottom: 28px; }
        .legal-page h2 {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          font-size: 1.4rem;
          color: var(--teal-dark);
          margin: 36px 0 12px;
        }
        .legal-page p { font-size: 1rem; line-height: 1.75; margin: 0 0 14px; }
        .legal-page ul { margin: 0 0 14px; padding-left: 22px; }
        .legal-page li { font-size: 1rem; line-height: 1.7; margin-bottom: 8px; }
        .legal-page strong { color: var(--ink); font-weight: 800; }
        .legal-page a { color: var(--teal-dark); font-weight: 700; }
        .legal-intro {
          background: var(--teal-light);
          border: 1px solid rgba(26,138,138,0.18);
          border-radius: 18px;
          padding: 22px 26px;
          margin-bottom: 8px;
        }
        .legal-intro p { margin: 0; color: var(--ink); font-weight: 600; }
        .legal-back {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--teal-dark); font-weight: 800; font-size: 0.92rem;
          text-decoration: none; margin-bottom: 28px;
        }
        .legal-foot {
          margin-top: 44px; padding-top: 20px;
          border-top: 1px solid rgba(26,138,138,0.18);
          font-size: 0.9rem; color: var(--ink-muted);
        }
      `}</style>

      <div className="legal-page">
        <div className="legal-wrap">
          <Link href="/" className="legal-back">← Back to MathParenting</Link>

          <h1>Privacy Policy</h1>
          <div className="legal-updated">Last updated: {UPDATED}</div>

          <div className="legal-intro">
            <p>
              The short version: your conversations and chat history are stored only on your own device, never on our servers.
              We keep just your email, name, and subscription status. We never sell your data. This page explains the details honestly.
            </p>
          </div>

          <h2>Who this policy is for</h2>
          <p>
            MathParenting ("we", "us", "the service") is an online tool that helps an adult guide a child through math homework.
            Accounts are intended for adults aged 18 or older. An account holder may use the service to help any child, including
            their own child, a younger sibling, a relative, or a student. The service is not directed to children, and children
            should only use it together with the responsible adult who holds the account.
          </p>

          <h2>What we collect, and what we do not</h2>
          <p>We deliberately collect as little as possible. Here is the complete picture.</p>
          <ul>
            <li><strong>Account information:</strong> your email address and name, used to create and secure your account. This is handled through our authentication provider, Supabase.</li>
            <li><strong>Subscription status:</strong> whether your subscription is active or canceled, so we know whether to unlock the chat. Payments themselves are handled by Stripe, and we never see or store your card number.</li>
            <li><strong>Homework questions you send to the chat:</strong> the text and any photos you submit are processed to generate a teaching response (see the next section). We do not save your conversations on our servers.</li>
          </ul>
          <p>
            <strong>Your chat history stays on your device.</strong> The questions you ask, the responses you receive, and your past
            sessions are saved only in your own web browser on your own device (using browser local storage). They are not uploaded
            to us, we cannot read them, and clearing your browser data removes them.
          </p>

          <h2>How your homework questions are processed</h2>
          <p>
            To generate teaching guidance, the question you send (and any photo of a worksheet) is sent in that moment to our AI
            provider, OpenAI, which produces the step by step response. This is required for the service to work, the same way a
            search engine needs your search to return results.
          </p>
          <p>
            We send only the question content to the AI provider. We do <strong>not</strong> attach your name, email, or account
            identity to that request. We do not store the question on our servers after the response is generated. OpenAI processes
            the request under its own terms; per those terms, data sent through the API is not used to train its models.
          </p>

          <h2>Who we share data with</h2>
          <p>We use a small number of trusted service providers, each only for the function listed:</p>
          <ul>
            <li><strong>Supabase</strong> — secure account login and storing your email, name, and subscription status.</li>
            <li><strong>Stripe</strong> — processing your subscription payment. Stripe handles your card details directly; we never receive them.</li>
            <li><strong>OpenAI</strong> — generating the teaching response from the question you send, as described above.</li>
            <li><strong>Vercel</strong> — hosting the website and running the service.</li>
          </ul>
          <p>We do not sell your personal information, and we do not share it for advertising.</p>

          <h2>Cookies</h2>
          <p>
            We use only the cookies necessary to keep you securely signed in. We do not use advertising or third party tracking cookies.
          </p>

          <h2>Your choices and rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, or delete the personal information we hold about you.
            Because your chat history lives only on your device, you can clear it yourself at any time from within the app or by clearing
            your browser data. To delete your account and the limited information we store (email, name, subscription status), or to make
            any privacy request, email us at <a href="mailto:support@mathparenting.com">support@mathparenting.com</a> and we will help.
          </p>

          <h2>Data retention</h2>
          <p>
            We keep your account information for as long as your account is active. If you ask us to delete your account, we remove your
            email, name, and subscription record from our systems, subject to any limited records we must keep for legal or accounting reasons.
          </p>

          <h2>International users</h2>
          <p>
            MathParenting is available to people in many countries. By using the service, you understand that your information may be
            processed by us and our service providers, which may be located in countries other than your own. We aim to follow widely
            recognized privacy principles, including transparency, data minimization, and giving you control over your information.
          </p>

          <h2>Children</h2>
          <p>
            Accounts are for adults. We do not knowingly create accounts for children or knowingly collect personal information from a
            child as an account holder. If you believe a child has created an account, contact us and we will remove it.
          </p>

          <h2>Changes to this policy</h2>
          <p>
            If we change how we handle your data, we will update this page and change the date at the top. Significant changes will be
            communicated where appropriate.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about your privacy? Email <a href="mailto:support@mathparenting.com">support@mathparenting.com</a> and we will respond.
          </p>

          <div className="legal-foot">
            See also our <Link href="/terms">Terms of Service</Link>. MathParenting is learning support, not a replacement for school instruction.
          </div>
        </div>
      </div>
    </>
  );
}
