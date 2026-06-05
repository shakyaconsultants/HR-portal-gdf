import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { RegistrationStepper } from "@/components/public/RegistrationStepper";

type Props = {
  searchParams: Promise<{ id?: string; name?: string }>;
};

export default async function ApplySuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const registrationId = params.id?.trim() ?? "";
  const name = params.name?.trim() ?? "";

  return (
    <PublicRegistrationShell sidebar={<RegistrationStepper stage={3} />}>
      <div className="pub-form-panel pub-success-panel">
        <div className="pub-success-visual" aria-hidden>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
            <path
              d="M8 12.5l2.5 2.5L16 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="pub-success-title">Application received</h2>
        <p className="pub-success-text">
          {name ? (
            <>
              Thank you, <strong>{name}</strong>. Your registration is now with our HR team.
            </>
          ) : (
            <>Your registration has been submitted successfully.</>
          )}
        </p>

        {registrationId ? (
          <div className="pub-reg-block">
            <span className="pub-reg-label">Registration ID</span>
            <code className="pub-reg-code">{registrationId}</code>
            <span className="pub-reg-hint">Save this ID for future reference</span>
          </div>
        ) : null}

        <ul className="pub-success-steps">
          <li>HR will verify your documents within a few business days.</li>
          <li>You will receive updates via email or phone.</li>
          <li>Keep your registration ID ready for any follow-up.</li>
        </ul>

        <p className="muted pub-success-footnote">
          You may close this page. Our HR team will contact you about the next steps.
        </p>
      </div>
    </PublicRegistrationShell>
  );
}
