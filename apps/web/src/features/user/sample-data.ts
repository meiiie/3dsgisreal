import type { UserLibraryStatus } from "./domain";

export const sampleUserProfile = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Sinh viên thử nghiệm",
};

export const sampleUserPlaceActivities: Array<{
  placeId: string;
  status: UserLibraryStatus;
  note: string;
  savedAt: string;
  lastViewedAt?: string;
}> = [
  {
    placeId: "home-test-room",
    status: "visited",
    note: "Theo dõi scene lab đầu tiên từ cổng vào phòng.",
    savedAt: "2026-06-01T08:30:00.000Z",
    lastViewedAt: "2026-06-02T06:30:00.000Z",
  },
  {
    placeId: "student-cafe-demo",
    status: "saved",
    note: "Dùng để thử hotspot, audio và quiz ngắn.",
    savedAt: "2026-06-01T11:10:00.000Z",
  },
  {
    placeId: "heritage-gate-demo",
    status: "checked_in",
    note: "Mẫu luồng di tích cho check-in và quay lại bản đồ.",
    savedAt: "2026-05-29T09:00:00.000Z",
    lastViewedAt: "2026-06-01T13:20:00.000Z",
  },
];

export const sampleUserQuizAttempts = [
  {
    id: "sample-quiz-home-observe",
    profileId: sampleUserProfile.id,
    placeId: "home-test-room",
    hotspotTitle: "Kiểm tra quan sát",
    question: "Điểm nào nên giữ ổn định khi quay lại scene?",
    selectedOption: "Ánh sáng và mốc đường đi",
    selectedIndex: 0,
    correct: true,
    reward: "local-demo-quiz",
    answeredAt: "2026-06-02T09:30:00.000Z",
  },
];
