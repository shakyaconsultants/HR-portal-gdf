import { redirect } from "next/navigation";

export default function RegistrationsPage() {
  redirect("/candidates?pipeline=registration");
}
