import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { apiError, apiOk, requireAuth } from "@/lib/api";
import { createUserSchema } from "@/lib/validators";
import { User } from "@/models/User";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ["ADMIN"]);
  if (auth.error) {
    return auth.error;
  }

  await connectDb();
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
  }

  const exists = await User.exists({ email: parsed.data.email });
  if (exists) {
    return apiError("Email already exists", 409);
  }

  const user = await User.createWithPassword(parsed.data);
  return apiOk(
    {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    201
  );
}

