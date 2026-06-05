import Link from "next/link";
import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { COMPANY } from "@/lib/company";

export default function ApplyBlockedPage() {
  return (
    <PublicRegistrationShell>
      <div className="pub-form-panel pub-success-panel">
        <h2 className="pub-success-title">Registration link required</h2>
        <p className="pub-success-text">
          The candidate registration form is only available through the unique link sent with your Letter of
          Intent from {COMPANY.name}.
        </p>
        <ul className="pub-success-steps">
          <li>Check your email for the Letter of Intent from HR.</li>
          <li>Open the registration link included in that message.</li>
          <li>Do not share your link — it is personal and can only be used once.</li>
        </ul>
        <p className="muted" style={{ marginTop: "1.5rem" }}>
          Need help? Contact the HR team using the details in your Letter of Intent.
        </p>
        <Link href="/" className="pub-btn pub-btn-primary pub-btn-block" style={{ marginTop: "1rem" }}>
          Back to portal home
        </Link>
      </div>
    </PublicRegistrationShell>
  );
}
