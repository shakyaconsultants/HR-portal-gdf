import { PublicRegisterForm } from "@/app/(public)/apply/PublicRegisterForm";
import { PublicRegistrationShell } from "@/components/public/PublicRegistrationShell";
import { resolveRegistrationAccess } from "@/lib/registration-access";

type Props = { params: Promise<{ token: string }> };

export default async function ApplyWithTokenPage({ params }: Props) {
  const { token } = await params;
  const access = await resolveRegistrationAccess(token);

  if (!access.ok) {
    return (
      <PublicRegistrationShell>
        <div className="pub-form-panel pub-success-panel">
          <h2 className="pub-success-title">{access.title}</h2>
          <p className="pub-success-text">{access.message}</p>
        </div>
      </PublicRegistrationShell>
    );
  }

  return (
    <PublicRegisterForm
      token={token}
      prefill={access.prefill}
      leadMeta={
        access.source === "lead"
          ? {
              referenceSource: access.prefill.referenceSource,
              referenceName: access.prefill.referenceName,
            }
          : undefined
      }
      expiresAtLabel={access.expiresAtLabel ?? undefined}
    />
  );
}
