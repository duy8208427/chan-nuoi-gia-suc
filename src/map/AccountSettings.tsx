import { useEffect, useState } from "react";
import { fetchAccountProfile, fetchPasswordForm, submitPasswordForm, type PasswordField, type PasswordForm } from "../api";

type Props = {
  account: string | null;
  live: boolean;
  regionLocation: string;
};

function valueFor(field: PasswordField, index: number, total: number, current: string, next: string, again: string): string {
  const text = `${field.label} ${field.name}`.toLowerCase();
  if (/hiện tại|cũ|old|current/.test(text)) return current;
  if (/nhập lại|xác nhận|confirm|retype|repeat/.test(text)) return again;
  if (/mới|new/.test(text)) return next;
  if (total <= 1) return next;
  if (total === 2) return index === 0 ? current : next;
  return [current, next, again][index] ?? again;
}

export function AccountSettings({ account, live, regionLocation }: Props) {
  const signedIn = Boolean(account);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<PasswordForm | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancel = false;
    void (async () => {
      try {
        const profile = await fetchAccountProfile();
        if (cancel) return;
        if (profile !== "expired") {
          setFullname(profile.fullname);
          setEmail(profile.email);
        }
        const passwordForm = await fetchPasswordForm();
        if (cancel) return;
        if (passwordForm === "expired") setExpired(true);
        else setForm(passwordForm);
      } catch {
        if (!cancel) setLoadError("Không kết nối được máy chủ.");
      }
    })();
    return () => {
      cancel = true;
    };
  }, [signedIn]);

  const changePassword = async () => {
    setNotice(null);
    if (!current || !next || next !== again) {
      setNotice({ ok: false, text: !current || !next ? "Nhập đủ mật khẩu hiện tại và mật khẩu mới." : "Mật khẩu mới không khớp." });
      return;
    }
    setBusy(true);
    try {
      let active = form;
      if (!active) {
        const loaded = await fetchPasswordForm();
        if (loaded === "expired") {
          setExpired(true);
          setNotice({ ok: false, text: "Cần đăng nhập lại để đổi mật khẩu." });
          return;
        }
        if (!loaded) {
          setNotice({ ok: false, text: "Máy chủ chưa mở form đổi mật khẩu." });
          return;
        }
        active = loaded;
        setForm(loaded);
      }
      const values = active.fields.map((field, index) => valueFor(field, index, active.fields.length, current, next, again));
      const result = await submitPasswordForm(active, values);
      setNotice({ ok: result.ok, text: result.message });
      if (result.ok) {
        setCurrent("");
        setNext("");
        setAgain("");
      }
    } catch {
      setNotice({ ok: false, text: "Không kết nối được máy chủ." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-settings">
      <section>
        <h3>Hồ sơ</h3>
        <b>{account ?? "Dữ liệu đã lưu"}</b>
        {signedIn && live ? <p>Số liệu trực tiếp</p> : null}
        {fullname ? <p>Họ tên: {fullname}</p> : null}
        {email ? <p>Email: {email}</p> : null}
        <p>{regionLocation}</p>
      </section>

      {signedIn ? (
        <section>
          <h3>Đổi mật khẩu</h3>
          {loadError ? <p className="account-note">{loadError}</p> : null}
          {expired ? <p className="account-note">Cần đăng nhập lại để đổi mật khẩu.</p> : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void changePassword();
            }}
          >
            <label>
              Mật khẩu hiện tại
              <input type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
            </label>
            <label>
              Mật khẩu mới
              <input type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} />
            </label>
            <label>
              Nhập lại mật khẩu mới
              <input type="password" autoComplete="new-password" value={again} onChange={(event) => setAgain(event.target.value)} />
            </label>
            <button className="btn-primary" type="submit" disabled={busy || expired}>
              {busy ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
          </form>
        </section>
      ) : (
        <p className="account-note">Đăng nhập tài khoản để tự đổi mật khẩu.</p>
      )}

      {notice ? <p className={`account-msg ${notice.ok ? "ok" : "bad"}`}>{notice.text}</p> : null}
    </div>
  );
}
