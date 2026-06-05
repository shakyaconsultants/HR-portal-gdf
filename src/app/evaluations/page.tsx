import { redirect } from "next/navigation";

export default function EvaluationsPage() {
  redirect("/candidates?pipeline=mock");
}
