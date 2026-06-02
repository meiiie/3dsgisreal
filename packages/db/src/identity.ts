import { sql, type Kysely } from "kysely";

import type { Database, ProjectMemberRole } from "./schema";

export const LOCAL_STUDENT_PROFILE_ID = "00000000-0000-4000-8000-000000000001";
export const LOCAL_ADMIN_PROFILE_ID = "00000000-0000-4000-8000-000000000002";

export type ProfileAccessRow = {
  profileId: string;
  displayName: string | null;
  avatarUrl: string | null;
  projectRoles: ProjectMemberRole[];
};

export async function getProfileAccessRow(
  db: Kysely<Database>,
  profileId: string,
): Promise<ProfileAccessRow | undefined> {
  const result = await sql<ProfileAccessRow>`
    select
      profiles.id::text as "profileId",
      profiles.display_name as "displayName",
      profiles.avatar_url as "avatarUrl",
      coalesce(
        array_agg(project_members.role order by project_members.role)
          filter (where project_members.role is not null),
        '{}'::text[]
      ) as "projectRoles"
    from public.profiles profiles
    left join public.project_members project_members
      on project_members.user_id = profiles.id
    where profiles.id = ${profileId}::uuid
    group by profiles.id, profiles.display_name, profiles.avatar_url
    limit 1
  `.execute(db);

  return result.rows[0];
}
