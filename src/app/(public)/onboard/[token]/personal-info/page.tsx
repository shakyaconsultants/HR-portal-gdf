import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

export default async function LegacyPersonalInfoPage({ params }: Props) {
  const { token } = await params;
  redirect(`/onboard/${token}/joining-form`);
}
