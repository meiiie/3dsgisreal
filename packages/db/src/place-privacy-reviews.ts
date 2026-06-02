import { sql, type Kysely } from "kysely";

import type { Database, PlacePrivacyReviewDecision } from "./schema";

export type PlacePrivacyReviewRow = {
  id: string;
  placeSlug: string;
  reviewerId: string | null;
  decision: PlacePrivacyReviewDecision;
  consentConfirmed: boolean;
  addressPublicSafe: boolean;
  facesOrPeopleRemoved: boolean;
  privateObjectsRemoved: boolean;
  audioPrivateSafe: boolean;
  rawCapturePrivate: boolean;
  notes: string;
  createdAt: Date;
};

export type CreatePlacePrivacyReviewInput = {
  placeSlug: string;
  reviewerId?: string;
  decision: PlacePrivacyReviewDecision;
  consentConfirmed: boolean;
  addressPublicSafe: boolean;
  facesOrPeopleRemoved: boolean;
  privateObjectsRemoved: boolean;
  audioPrivateSafe: boolean;
  rawCapturePrivate: boolean;
  notes: string;
};

export async function getLatestPlacePrivacyReviewRow(
  db: Kysely<Database>,
  placeSlug: string,
): Promise<PlacePrivacyReviewRow | undefined> {
  const result = await sql<PlacePrivacyReviewRow>`
    select
      review.id::text as "id",
      place.slug as "placeSlug",
      review.reviewer_id::text as "reviewerId",
      review.decision as "decision",
      review.consent_confirmed as "consentConfirmed",
      review.address_public_safe as "addressPublicSafe",
      review.faces_or_people_removed as "facesOrPeopleRemoved",
      review.private_objects_removed as "privateObjectsRemoved",
      review.audio_private_safe as "audioPrivateSafe",
      review.raw_capture_private as "rawCapturePrivate",
      review.notes as "notes",
      review.created_at as "createdAt"
    from public.places place
    join public.place_privacy_reviews review on review.place_id = place.id
    where place.slug = ${placeSlug}
    order by review.created_at desc
    limit 1
  `.execute(db);

  return result.rows[0];
}

export async function createPlacePrivacyReview(
  db: Kysely<Database>,
  input: CreatePlacePrivacyReviewInput,
): Promise<PlacePrivacyReviewRow> {
  const result = await sql<PlacePrivacyReviewRow>`
    with target_place as (
      select id, slug
      from public.places
      where slug = ${input.placeSlug}
    ),
    inserted as (
      insert into public.place_privacy_reviews (
        place_id,
        reviewer_id,
        decision,
        consent_confirmed,
        address_public_safe,
        faces_or_people_removed,
        private_objects_removed,
        audio_private_safe,
        raw_capture_private,
        notes
      )
      select
        target_place.id,
        ${input.reviewerId ?? null}::uuid,
        ${input.decision},
        ${input.consentConfirmed},
        ${input.addressPublicSafe},
        ${input.facesOrPeopleRemoved},
        ${input.privateObjectsRemoved},
        ${input.audioPrivateSafe},
        ${input.rawCapturePrivate},
        ${input.notes}
      from target_place
      returning *
    )
    select
      inserted.id::text as "id",
      target_place.slug as "placeSlug",
      inserted.reviewer_id::text as "reviewerId",
      inserted.decision as "decision",
      inserted.consent_confirmed as "consentConfirmed",
      inserted.address_public_safe as "addressPublicSafe",
      inserted.faces_or_people_removed as "facesOrPeopleRemoved",
      inserted.private_objects_removed as "privateObjectsRemoved",
      inserted.audio_private_safe as "audioPrivateSafe",
      inserted.raw_capture_private as "rawCapturePrivate",
      inserted.notes as "notes",
      inserted.created_at as "createdAt"
    from inserted
    join target_place on target_place.id = inserted.place_id
  `.execute(db);

  const created = result.rows[0];

  if (!created) {
    throw new Error("Place not found.");
  }

  return created;
}
