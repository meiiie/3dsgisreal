"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createHotspotFromIntake,
  deleteHotspotFromIntake,
  formDataToHotspotIntake,
  updateHotspotFromIntake,
} from "@/features/scenes/server/hotspot-intake";

export async function createHotspotAction(formData: FormData) {
  const draft = formDataToHotspotIntake(formData);
  const sceneSlug = readFormString(formData, "sceneSlug");
  const result = await createHotspotFromIntake(draft);
  const params = new URLSearchParams();

  if (!sceneSlug) {
    redirect("/admin?hotspot=missing-scene");
  }

  if (!result.ok) {
    params.set("created", "0");
    params.set("error", result.errors[0] ?? "Du lieu hotspot khong hop le.");
    redirect(`/admin/scenes/${encodeURIComponent(sceneSlug)}/hotspots?${params.toString()}`);
  }

  params.set("created", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("hotspot", result.created?.hotspotId ?? result.draft.title);
  params.set("kind", result.draft.kind);

  revalidateHotspotPaths(sceneSlug);
  redirect(`/admin/scenes/${encodeURIComponent(sceneSlug)}/hotspots?${params.toString()}`);
}

export async function updateHotspotAction(formData: FormData) {
  const draft = formDataToHotspotIntake(formData);
  const sceneSlug = readFormString(formData, "sceneSlug");
  const result = await updateHotspotFromIntake(draft);
  const params = new URLSearchParams();

  if (!sceneSlug) {
    redirect("/admin?hotspot=missing-scene");
  }

  if (!result.ok) {
    params.set("updated", "0");
    params.set("error", result.errors[0] ?? "Du lieu hotspot khong hop le.");
    redirect(`/admin/scenes/${encodeURIComponent(sceneSlug)}/hotspots?${params.toString()}`);
  }

  params.set("updated", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("hotspot", result.updated?.hotspotId ?? result.draft.hotspotId ?? result.draft.title);
  params.set("kind", result.draft.kind);

  revalidateHotspotPaths(sceneSlug);
  redirect(`/admin/scenes/${encodeURIComponent(sceneSlug)}/hotspots?${params.toString()}`);
}

export async function deleteHotspotAction(formData: FormData) {
  const draft = formDataToHotspotIntake(formData);
  const sceneSlug = readFormString(formData, "sceneSlug");
  const result = await deleteHotspotFromIntake(draft);
  const params = new URLSearchParams();

  if (!sceneSlug) {
    redirect("/admin?hotspot=missing-scene");
  }

  if (!result.ok) {
    params.set("deleted", "0");
    params.set("error", result.errors[0] ?? "Khong xoa duoc hotspot.");
    redirect(`/admin/scenes/${encodeURIComponent(sceneSlug)}/hotspots?${params.toString()}`);
  }

  params.set("deleted", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("hotspot", result.deleted?.hotspotId ?? result.draft.hotspotId);

  revalidateHotspotPaths(sceneSlug);
  redirect(`/admin/scenes/${encodeURIComponent(sceneSlug)}/hotspots?${params.toString()}`);
}

function revalidateHotspotPaths(sceneSlug: string) {
  revalidatePath(`/admin/scenes/${sceneSlug}/hotspots`);
  revalidatePath(`/api/admin/scenes/${sceneSlug}/hotspots`);
  revalidatePath(`/api/scenes/${sceneSlug}/manifest`);
  revalidatePath(`/viewer/${sceneSlug}`);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
