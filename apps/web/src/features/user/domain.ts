import { isSceneEnterable, type Place } from "@/features/places/domain";

export type UserLibraryStatus = "saved" | "visited" | "checked_in";

export type UserProfile = {
  id: string;
  displayName: string;
};

export type UserPlaceItem = {
  profileId: string;
  place: Place;
  status: UserLibraryStatus;
  note: string;
  savedAt: string;
  lastViewedAt?: string;
};

export type UserQuizAttemptItem = {
  id: string;
  profileId: string;
  place: Place;
  hotspotTitle: string;
  question: string;
  selectedOption: string;
  selectedIndex: number;
  correct: boolean;
  reward: string;
  answeredAt: string;
};

export type UserQuizStats = {
  total: number;
  correct: number;
};

export type UserDashboard = {
  profile: UserProfile;
  items: UserPlaceItem[];
  quizAttempts: UserQuizAttemptItem[];
  quizStats: UserQuizStats;
  statusCounts: Record<UserLibraryStatus, number>;
  continueItems: UserPlaceItem[];
};

export const userLibraryStatusLabels: Record<UserLibraryStatus, string> = {
  saved: "Đã lưu",
  visited: "Đã xem",
  checked_in: "Đã check-in",
};

export function getUserPlaceNextAction(item: UserPlaceItem) {
  if (isSceneEnterable(item.place.scene)) {
    return "Vào lại không gian 3D";
  }

  if (item.place.scene.status === "processing") {
    return "Theo dõi trạng thái xử lý scene";
  }

  if (item.status === "checked_in") {
    return "Xem lại hồ sơ và ghi chú";
  }

  return "Mở hồ sơ địa điểm";
}

export function countUserLibraryStatuses(items: UserPlaceItem[]) {
  return items.reduce<Record<UserLibraryStatus, number>>(
    (counts, item) => ({
      ...counts,
      [item.status]: counts[item.status] + 1,
    }),
    { saved: 0, visited: 0, checked_in: 0 },
  );
}

export function getContinueItems(items: UserPlaceItem[]) {
  return items
    .filter((item) => item.lastViewedAt || item.place.scene.status === "processing")
    .slice(0, 3);
}

export function getUserQuizStats(attempts: UserQuizAttemptItem[]): UserQuizStats {
  return {
    total: attempts.length,
    correct: attempts.filter((attempt) => attempt.correct).length,
  };
}
