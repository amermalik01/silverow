// lib/services/auth/rbac.service.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export class RBACService {
  /**
   * CHECK PERMISSION
   */
  static async hasPermission(
    permission: string,
  ): Promise<boolean> {
    const session =
      await getServerSession(authOptions);

    if (!session?.user) {
      return false;
    }

    // PLATFORM ADMIN
    if (session.user.is_platform_admin) {
      return true;
    }

    const permissions =
      session.user.permissions || [];

    return permissions.includes(permission);
  }

  /**
   * REQUIRE PERMISSION
   */
  static async requirePermission(
    permission: string,
  ) {
    const allowed =
      await this.hasPermission(permission);

    if (!allowed) {
      throw new Error(
        "You do not have permission",
      );
    }
  }

  /**
   * CHECK ROLE
   */
  static async hasRole(
    role: string,
  ): Promise<boolean> {
    const session =
      await getServerSession(authOptions);

    if (!session?.user) {
      return false;
    }

    const roles = session.user.roles || [];

    return roles.includes(role);
  }
}