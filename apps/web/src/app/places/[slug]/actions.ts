"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  formDataToUserPlaceLibraryAction,
  updateUserPlaceLibraryFromPlace,
} from "@/features/user/server/place-library-action";
import { getCurrentSession } from "@/features/identity/server/session";

export async function updateUserPlaceLibraryAction(formData: FormData) {
  const draft = formDataToUserPlaceLibraryAction(formData);
  const placeSlug = readFormString(formData, "placeSlug");
  const session = await getCurrentSession();
  const result = await updateUserPlaceLibraryFromPlace(draft, session.profileId);
  const params = new URLSearchParams();

  if (!placeSlug) {
    redirect("/?userPlace=missing-place");
  }

  if (!result.ok) {
    params.set("userPlace", "0");
    params.set("error", result.errors[0] ?? "Khong ghi duoc trang thai dia diem.");
    redirect(`/places/${encodeURIComponent(placeSlug)}?${params.toString()}`);
  }

  params.set("userPlace", result.draft.status);
  params.set("persisted", result.persisted ? "1" : "0");

  revalidatePath(`/places/${placeSlug}`);
  revalidatePath("/user");
  revalidatePath("/api/user");
  redirect(`/places/${encodeURIComponent(placeSlug)}?${params.toString()}`);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
