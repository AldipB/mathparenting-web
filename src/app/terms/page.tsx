// src/app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | MathParenting",
  description: "The terms for using MathParenting: subscription, cancellation, fair use, and your responsibilities.",
};

const UPDATED = "June 25, 2026";

export default function TermsPage() {
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

          <h1>Terms of Service</h1>
          <div className="legal-updated">Last updated: {UPDATED}</div>

          <div className="legal-intro">
            <p>
              These terms explain what MathParenting is, what you can expect from us, and what we ask of you.
              By creating an account or using the service, you agree to them.
            </p>
          </div>

          <h2>1. What MathParenting is</h2>
          <p>
            MathParenting helps an adult guide a child through math homework by providing step by step teaching plans, household
            activities, and coaching. It is <strong>learning support, not a replacement for school instruction</strong>, and it does
            not guarantee any particular academic result. You are responsible for how you use the guidance with your child.
          </p>

          <h2>2. Who can use it</h2>
          <p>
            You must be at least 18 years old to create and hold an account. As the adult account holder, you may use MathParenting to
            help any child, including your own child, a younger sibling, a relative, or a student. Children should only use the service
            together with the responsible adult who holds the account. You are responsible for all activity under your account and for
            keeping your login secure.
          </p>

          <h2>3. Subscription and billing</h2>
          <ul>
            <li>MathParenting is a paid subscription priced at <strong>USD $12.99 per month</strong>.</li>
            <li>Your subscription <strong>renews automatically</strong> each month until you cancel.</li>
            <li>Prices are shown in US dollars. Your bank or card provider converts the charge to your local currency, and any conversion fees are set by them, not by us.</li>
            <li>Payments are processed securely by Stripe. We never see or store your full card details.</li>
          </ul>

          <h2>4. Cancellation</h2>
          <p>
            You can cancel anytime from the <strong>Account</strong> page, which opens a secure billing portal. When you cancel, your
            subscription does not renew again, and you keep access until the end of the billing period you have already paid for.
          </p>

          <h2>5. Refunds</h2>
          <p>
            Because you can cancel at any time before your next renewal, <strong>payments are non-refundable</strong>, including for
            partial billing periods. If you believe you were charged in error, email us at{" "}
            <a href="mailto:support@mathparenting.com">support@mathparenting.com</a> and we will look into it in good faith.
          </p>

          <h2>6. Fair use and limits</h2>
          <p>
            To keep the service fast and affordable for everyone, usage is subject to reasonable limits. In particular, the chat is
            limited to <strong>up to 30 messages per hour per account</strong>. This is generous for normal homework help and mainly
            exists to prevent misuse. We may adjust these limits over time to protect the service.
          </p>

          <h2>7. Acceptable use</h2>
          <p>By using MathParenting, you agree not to:</p>
          <ul>
            <li>share your account or resell access to others;</li>
            <li>attempt to break, overload, scrape, or reverse engineer the service;</li>
            <li>use it for anything unlawful, or to submit content you do not have the right to submit;</li>
            <li>use it in a way that harms a child or any other person.</li>
          </ul>

          <h2>8. Your content</h2>
          <p>
            The homework questions and photos you submit remain yours. You grant us only the limited permission needed to process them
            in order to provide the teaching response, as described in our <Link href="/privacy">Privacy Policy</Link>. Your chat history
            is stored on your own device, not on our servers.
          </p>

          <h2>9. Availability and changes</h2>
          <p>
            We work to keep MathParenting running smoothly, but we do not guarantee it will always be available or error free. We may
            update, improve, or discontinue features, and we may change these terms. If we make significant changes, we will update this
            page and the date above. Continuing to use the service after changes means you accept the updated terms.
          </p>

          <h2>10. Disclaimer and limitation of liability</h2>
          <p>
            MathParenting is provided "as is" without warranties of any kind. The teaching guidance is generated by an AI system and may
            occasionally be incomplete or incorrect; please use your own judgment. To the fullest extent permitted by law, we are not
            liable for any indirect or consequential damages arising from your use of the service, and our total liability to you is
            limited to the amount you paid us in the three months before the claim.
          </p>

          <h2>11. Governing law</h2>
          <p>
            These terms are governed by the laws of the Province of Ontario and the applicable laws of Canada, without regard to conflict
            of law rules. If you use the service from another country, you remain responsible for complying with your local laws.
          </p>

          <h2>12. Contact</h2>
          <p>
            Questions about these terms? Email <a href="mailto:support@mathparenting.com">support@mathparenting.com</a>.
          </p>

          <div className="legal-foot">
            See also our <Link href="/privacy">Privacy Policy</Link>. MathParenting is learning support, not a replacement for school instruction.
          </div>
        </div>
      </div>
    </>
  );
}
