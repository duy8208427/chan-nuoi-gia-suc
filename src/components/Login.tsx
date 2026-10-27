import { useState } from "react";
import { SelectMenu } from "./SelectMenu";
import type { AppRole } from "../types";

const ROLES: { value: AppRole; label: string }[] = [
  { value: "resident", label: "Công nhân chuồng" },
  { value: "farmer", label: "Chủ trại" },
  { value: "admin", label: "Admin" },
];

type Props = {
  loading: boolean;
  error: string;
  onLogin: (username: string, password: string, role: AppRole) => void;
  onDemo: (role: AppRole) => void;
};

export function Login({ loading, error, onLogin, onDemo }: Props) {
  const [role, setRole] = useState<AppRole>("resident");

  return (
    <div className="login-page">
      <form
        className="login-card"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onLogin(String(data.get("username") ?? ""), String(data.get("password") ?? ""), role);
        }}
      >
        <span className="brand-mark login-mark" aria-hidden="true">
          <img src="/vsg-logo.png?v=2" alt="" />
        </span>
        <h1>Chăn nuôi gia súc</h1>
        <p>Visual Sense Group · bản đồ chuồng trại</p>
        <label>
          Username
          <input name="username" autoComplete="username" required placeholder="Nhập username" />
        </label>
        <label>
          Mật khẩu
          <input name="password" type="password" autoComplete="current-password" required placeholder="Nhập mật khẩu" />
        </label>
        {error ? <div className="login-error">{error}</div> : null}
        <div className="login-submit">
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
          <SelectMenu
            value={role}
            options={ROLES}
            onChange={(value) => setRole(value as AppRole)}
            ariaLabel="Chọn vai trò"
            disabled={loading}
          />
        </div>
        <button className="btn-ghost" type="button" onClick={() => onDemo(role)} disabled={loading}>
          Xem dữ liệu đã lưu
        </button>
      </form>
    </div>
  );
}
