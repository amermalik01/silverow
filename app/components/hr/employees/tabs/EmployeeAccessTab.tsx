// app/components/hr/employees/tabs/EmployeeAccessTab.tsx
type Props = {
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
