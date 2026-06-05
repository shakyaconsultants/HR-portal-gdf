import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { apiError, apiOk } from "@/lib/api";
import { getServerConfigError, mapDbErrorMessage } from "@/lib/config";
import { User } from "@/models/User";
import { attachAuthCookie, signAuthToken } from "@/lib/auth";
export async function POST(request: NextRequest) {
  try {
    const configError = getServerConfigError();
    if (configError) {
      return apiError(configError, 503, "CONFIG");
    }

    await connectDb();
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid payload", 422);
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash").lean();
    if (!user) {
      return apiError("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return apiError("Invalid credentials", 401);
    }

    const token = await signAuthToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const response = apiOk({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return attachAuthCookie(response, token);
  } catch (error) {
    console.error("Login API error", error);
    const mapped = mapDbErrorMessage(error);
    if (mapped) {
      return apiError(mapped, 503, "DB_UNAVAILABLE");
    }
    return apiError("Login failed. Please try again later.", 500, "SERVER");
  }
}

