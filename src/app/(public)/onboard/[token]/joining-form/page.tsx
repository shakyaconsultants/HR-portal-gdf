import { OnboardingFormPage } from "@/app/(public)/onboard/[token]/OnboardingFormPage";

type Props = { params: Promise<{ token: string }> };

export default async function JoiningFormPage({ params }: Props) {
  const { token } = await params;
  return <OnboardingFormPage token={token} section="JOINING_FORM" slug="joining-form" />;
}
