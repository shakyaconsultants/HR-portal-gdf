import { redirect } from "next/navigation";

export default function HiringDecisionsPage() {
  redirect("/candidates?pipeline=hiring");
}
