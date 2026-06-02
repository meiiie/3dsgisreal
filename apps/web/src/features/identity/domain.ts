import {
  LOCAL_ADMIN_PROFILE_ID,
  LOCAL_STUDENT_PROFILE_ID,
  type ProjectMemberRole,
} from "@loi-vao/db";

export type LocalSessionRole = "student" | "admin";

export type LocalSession = {
  profileId: string;
  displayName: string;
  role: LocalSessionRole;
  projectRoles: ProjectMemberRole[];
  issuedAt: number;
  isDefault: boolean;
};

export type LocalSessionChoice = {
  profileId: string;
  displayName: string;
  role: LocalSessionRole;
  projectRoles: ProjectMemberRole[];
  description: string;
};

export const localSessionChoices: Record<LocalSessionRole, LocalSessionChoice> = {
  student: {
    profileId: LOCAL_STUDENT_PROFILE_ID,
    displayName: "Sinh vien thu nghiem",
    role: "student",
    projectRoles: [],
    description: "Dung cho ban do, ho so user, luu dia diem, quiz va check-in.",
  },
  admin: {
    profileId: LOCAL_ADMIN_PROFILE_ID,
    displayName: "Quan tri local",
    role: "admin",
    projectRoles: ["admin"],
    description: "Dung cho capture, job GPU, asset, hotspot va review dia diem.",
  },
};

const adminProjectRoles: ProjectMemberRole[] = ["owner", "admin", "editor", "reviewer"];

export function getDefaultLocalSession(): LocalSession {
  return {
    ...localSessionChoices.student,
    issuedAt: 0,
    isDefault: true,
  };
}

export function createLocalSession(role: LocalSessionRole, issuedAt = Date.now()): LocalSession {
  return {
    ...localSessionChoices[role],
    issuedAt,
    isDefault: false,
  };
}

export function resolveLocalSessionChoice(value: string): LocalSessionChoice | undefined {
  return localSessionChoices[value as LocalSessionRole];
}

export function canAccessAdmin(session: Pick<LocalSession, "projectRoles">) {
  return session.projectRoles.some((role) => adminProjectRoles.includes(role));
}
