import {
  getDatabase,
  listUserQuizAttemptRows,
  listUserPlaceActivityRows,
  LOCAL_DEMO_PROFILE_ID,
  type UserQuizAttemptRow,
  type UserPlaceActivityRow,
} from "@loi-vao/db";

import { localSessionChoices } from "@/features/identity/domain";
import { listPlaces } from "@/features/places/server/repository";

import {
  countUserLibraryStatuses,
  getContinueItems,
  getUserQuizStats,
  type UserDashboard,
  type UserPlaceItem,
  type UserQuizAttemptItem,
  type UserProfile,
} from "../domain";
import { sampleUserPlaceActivities, sampleUserProfile, sampleUserQuizAttempts } from "../sample-data";

export async function getUserDashboard(profileId = LOCAL_DEMO_PROFILE_ID): Promise<UserDashboard> {
  const database = getDatabase();
  const places = await listPlaces();
  const rows = database ? await listUserPlaceActivityRows(database, profileId) : [];
  const quizRows = database ? await listUserQuizAttemptRows(database, profileId) : [];

  const fallbackProfile = getFallbackProfile(profileId);
  const profile: UserProfile = database
    ? { id: profileId, displayName: rows[0]?.displayName ?? fallbackProfile.displayName }
    : fallbackProfile;

  const items = database
    ? mapDbRowsToItems(rows, places, profile)
    : sampleUserPlaceActivities
        .map((activity) => {
          const place = places.find((candidate) => candidate.id === activity.placeId);

          if (!place) {
            return undefined;
          }

          return {
            profileId: profile.id,
            place,
            status: activity.status,
            note: activity.note,
            savedAt: activity.savedAt,
            ...(activity.lastViewedAt ? { lastViewedAt: activity.lastViewedAt } : {}),
          } satisfies UserPlaceItem;
        })
        .filter((item): item is UserPlaceItem => Boolean(item));

  const resolvedProfile = database && items[0]?.profileId
    ? { id: items[0].profileId, displayName: profile.displayName }
    : profile;
  const quizAttempts = database
    ? mapDbQuizRowsToItems(quizRows, places, resolvedProfile)
    : mapSampleQuizRowsToItems(places);

  return {
    profile: resolvedProfile,
    items,
    quizAttempts,
    quizStats: getUserQuizStats(quizAttempts),
    statusCounts: countUserLibraryStatuses(items),
    continueItems: getContinueItems(items),
  };
}

function mapSampleQuizRowsToItems(places: Awaited<ReturnType<typeof listPlaces>>): UserQuizAttemptItem[] {
  return sampleUserQuizAttempts
    .map((attempt) => {
      const place = places.find((candidate) => candidate.id === attempt.placeId);

      if (!place) {
        return undefined;
      }

      return {
        id: attempt.id,
        profileId: attempt.profileId,
        place,
        hotspotTitle: attempt.hotspotTitle,
        question: attempt.question,
        selectedOption: attempt.selectedOption,
        selectedIndex: attempt.selectedIndex,
        correct: attempt.correct,
        reward: attempt.reward,
        answeredAt: attempt.answeredAt,
      } satisfies UserQuizAttemptItem;
    })
    .filter((item): item is UserQuizAttemptItem => Boolean(item));
}

function getFallbackProfile(profileId: string): UserProfile {
  const choice = Object.values(localSessionChoices).find((candidate) => candidate.profileId === profileId);

  if (!choice) {
    return sampleUserProfile;
  }

  return {
    id: choice.profileId,
    displayName: choice.displayName,
  };
}

function mapDbQuizRowsToItems(
  rows: UserQuizAttemptRow[],
  places: Awaited<ReturnType<typeof listPlaces>>,
  fallbackProfile: UserProfile,
): UserQuizAttemptItem[] {
  return rows
    .map((row) => {
      const place = places.find((candidate) => candidate.id === row.placeId);

      if (!place) {
        return undefined;
      }

      return {
        id: row.id,
        profileId: row.profileId || fallbackProfile.id,
        place,
        hotspotTitle: row.hotspotTitle,
        question: row.question,
        selectedOption: row.selectedOption,
        selectedIndex: row.selectedIndex,
        correct: row.correct,
        reward: row.reward,
        answeredAt: toIsoString(row.answeredAt),
      } satisfies UserQuizAttemptItem;
    })
    .filter((item): item is UserQuizAttemptItem => Boolean(item));
}

function mapDbRowsToItems(
  rows: UserPlaceActivityRow[],
  places: Awaited<ReturnType<typeof listPlaces>>,
  fallbackProfile: UserProfile,
): UserPlaceItem[] {
  return rows
    .map((row) => {
      const place = places.find((candidate) => candidate.id === row.placeId);

      if (!place) {
        return undefined;
      }

      return {
        profileId: row.profileId,
        place,
        status: row.status,
        note: row.note,
        savedAt: toIsoString(row.savedAt),
        ...(row.lastViewedAt ? { lastViewedAt: toIsoString(row.lastViewedAt) } : {}),
      } satisfies UserPlaceItem;
    })
    .filter((item): item is UserPlaceItem => Boolean(item))
    .map((item) => ({
      ...item,
      profileId: item.profileId || fallbackProfile.id,
    }));
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
