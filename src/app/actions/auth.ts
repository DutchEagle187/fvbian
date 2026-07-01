"use server";

import { signIn, signOut } from "@/auth";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function reconnectGoogleAction() {
  await signIn("google", { redirectTo: "/dashboard/tools/tasks" });
}
