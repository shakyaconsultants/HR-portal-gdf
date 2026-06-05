import { OnboardingFormPage } from "@/app/(public)/onboard/[token]/OnboardingFormPage";

type Props = { params: Promise<{ token: string }> };

export default async function IdCardFormPage({ params }: Props) {
  const { token } = await params;
  return <OnboardingFormPage token={token} section="ID_CARD" slug="id-card" />;
}
