import { OnboardingHubClient } from "@/app/(public)/onboard/[token]/OnboardingHubClient";

type Props = { params: Promise<{ token: string }> };

export default async function OnboardingHubPage({ params }: Props) {
  const { token } = await params;
  return <OnboardingHubClient token={token} />;
}
