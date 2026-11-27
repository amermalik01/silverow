// app/components/hr/employees/tabs/EmployeeAccessTab.tsx

"use client";

import { Icon } from "@iconify/react";

import {
  SwitchPill,
  cardClass,
  fieldRowClass,
  inputClass,
  labelClass,
} from "./employeeFormKit";

type AccessState = {
  enable_login: boolean;
  email: string;
  password: string;
  role: string;
};

type Props = {
  access: AccessState;
  setAccess: React.Dispatch<React.SetStateAction<AccessState>>;
  isReadonly?: boolean;
};

/** System login for a new employee (sent with the create request). */
export default function EmployeeAccessTab({
  access,
  setAccess,
  isReadonly = false,
}: Props) {
  const update = (patch: Partial<AccessState>) =>
    setAccess((current) => ({ ...current, ...patch }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <section className={cardClass}>
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon
              icon="tabler:lock-access"
              className="shrink-0 text-2xl text-emerald-800 dark:text-emerald-400"
            />
            <div>
              <h3 className="text-sm font-semibold text-black dark:text-slate-100">
                System Login
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Create a user account so this employee can sign in.
              </p>
            </div>
          </div>
          <SwitchPill
            checked={access.enable_login}
            disabled={isReadonly}
            onChange={(next) => update({ enable_login: next })}
            label={access.enable_login ? "Enabled" : "Disabled"}
          />
        </div>

        {access.enable_login ? (
          <div className="grid grid-cols-1 items-start gap-y-3">
            <div className={fieldRowClass}>
              <label className={labelClass}>
                Login Email <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="email"
                  value={access.email}
                  disabled={isReadonly}
                  onChange={(e) => update({ email: e.target.value })}
                  className={inputClass}
                  placeholder="employee@company.com"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={labelClass}>
                Temporary Password <span className="ml-1 text-red-500">*</span>
              </label>
              <div className="sm:col-span-2">
                <input
                  type="password"
                  value={access.password}
                  disabled={isReadonly}
                  onChange={(e) => update({ password: e.target.value })}
                  className={inputClass}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <label className={labelClass}>Role</label>
              <div className="sm:col-span-2">
                <input
                  value={access.role}
                  disabled={isReadonly}
                  onChange={(e) => update({ role: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. hr_analyst"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-4 text-center text-[12px] text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">
            Login is off. Switch it on to create a sign-in for this employee.
          </div>
        )}
      </section>

      <section className={`${cardClass} text-[12px] text-slate-600 dark:text-slate-400`}>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-black dark:text-slate-100">
          <Icon icon="tabler:info-circle" className="text-2xl text-emerald-800 dark:text-emerald-400" />
          About employee login
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>The employee signs in with the login email and temporary password.</li>
          <li>Ask them to change the password after their first sign-in.</li>
          <li>Login details can be reviewed later in the General tab under Login &amp; Access.</li>
        </ul>
      </section>
    </div>
  );
}
