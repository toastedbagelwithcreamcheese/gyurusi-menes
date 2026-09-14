"use client";

import { useActionState } from "react";
import { login } from "../auth-actions";

/**
 * Belépő űrlap. A hibát (rossz jelszó, átmeneti tiltás) a szerver-akció adja vissza, és a Flash-sáv stílusában áll
 * az űrlap alatt; siker után a szerver a kért admin-lapra irányít. JavaScript nélkül is működik (sima POST).
 */
export function LoginForm({ next, askUser }: { next: string; askUser: boolean }) {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="form" data-login-form>
      <input type="hidden" name="next" value={next} />
      {askUser && (
        <div className="field">
          <label htmlFor="user">Felhasználónév</label>
          <input id="user" name="user" className="input" autoComplete="username" autoCapitalize="none" required defaultValue={state.user} />
        </div>
      )}
      <div className="field">
        <label htmlFor="password">Jelszó</label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus={!askUser} />
      </div>
      {state.error && (
        <div className="flash flash-err login-error" role="alert" data-login-error={state.locked ? "locked" : "wrong"}>
          <span>{state.error}</span>
        </div>
      )}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={pending} data-login-submit>{pending ? "Belépés…" : "Belépés"}</button>
      </div>
    </form>
  );
}
