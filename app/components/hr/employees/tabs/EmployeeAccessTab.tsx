// app/components/hr/employees/tabs/EmployeeAccessTab.tsx

// app/components/hr/employees/tabs/EmployeeAccessTab.tsx
"use client";

type Props = {
  access: { enable_login: boolean; email: string; password: string; role: string };
  setAccess: React.Dispatch<React.SetStateAction<{ enable_login: boolean; email: string; password: string; role: string }>>;
};

export default function EmployeeAccessTab({ access, setAccess }: Props) {
  const inputClass = "w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  const labelClass = "block text-xs font-semibold text-slate-600 capitalize tracking-wider mb-1.5";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
        <div className="pt-0.5">
          <input
            id="enable-login-toggle"
            type="checkbox"
            checked={access.enable_login}
            onChange={(e) => setAccess({ ...access, enable_login: e.target.checked })}
            className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 h-4 w-4 cursor-pointer"
          />
        </div>
        <label htmlFor="enable-login-toggle" className="cursor-pointer select-none">
          <span className="block text-xs font-semibold text-slate-800">Grant Corporate Dashboard Access</span>
          <span className="block text-xs text-slate-500 mt-0.5">Provision an active IAM session token allowing this user to sign into the system architecture grid.</span>
        </label>
      </div>

      {access.enable_login && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-slate-200 bg-white shadow-sm rounded-xl animate-fadeIn">
          <div className="md:col-span-2">
            <label className={labelClass}>IAM Identity Email Address</label>
            <input
              type="email"
              value={access.email}
              onChange={(e) => setAccess({ ...access, email: e.target.value })}
              className={inputClass}
              placeholder="sso.identity@domain.com"
            />
          </div>

          <div>
            <label className={labelClass}>Ephemeral Temporary Password</label>
            <input
              type="password"
              value={access.password}
              onChange={(e) => setAccess({ ...access, password: e.target.value })}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>Security Clearance Assignment (Role)</label>
            <input
              value={access.role}
              onChange={(e) => setAccess({ ...access, role: e.target.value })}
              className={inputClass}
              placeholder="e.g. hr_analyst_l2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* type Props = {
  access: {
    enable_login: boolean;
    email: string;
    password: string;
    role: string;
  };

  setAccess: React.Dispatch<
    React.SetStateAction<{
      enable_login: boolean;
      email: string;
      password: string;
      role: string;
    }>
  >;
};

export default function EmployeeAccessTab({ access, setAccess }: Props) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={access.enable_login}
          onChange={(e) =>
            setAccess({
              ...access,
              enable_login: e.target.checked,
            })
          }
        />
        Enable Login Access
      </label>

      {access.enable_login && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Login Email</label>

            <input
              value={access.email}
              onChange={(e) =>
                setAccess({
                  ...access,
                  email: e.target.value,
                })
              }
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label>Password</label>

            <input
              type="password"
              value={access.password}
              onChange={(e) =>
                setAccess({
                  ...access,
                  password: e.target.value,
                })
              }
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label>Role</label>

            <input
              value={access.role}
              onChange={(e) =>
                setAccess({
                  ...access,
                  role: e.target.value,
                })
              }
              className="border rounded p-2 w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
 */