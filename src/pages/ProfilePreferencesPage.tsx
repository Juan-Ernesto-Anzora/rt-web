import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { getCurrentUserProfile } from "../auth/userProfile";

type PreferenceState = {
  theme: "system" | "light" | "dark";
  density: "compact" | "comfortable";
  emailNotifications: boolean;
};

const DEFAULT_PREFERENCES: PreferenceState = {
  theme: "system",
  density: "compact",
  emailNotifications: true,
};

const STORAGE_KEY = "rt.profile.preferences";

function readPreferences(): PreferenceState {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } as PreferenceState;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(preferences: PreferenceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-neutral-500">{label}</div>
      <div className="mt-1 min-h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-900">
        {value || "Not provided"}
      </div>
    </div>
  );
}

function PreferenceOption({
  name,
  value,
  checked,
  label,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange(value: string): void;
}) {
  return (
    <label
      className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-3 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-primary-600 ${
        checked ? "border-primary-600 bg-primary-50 text-primary-700" : "border-neutral-300 bg-white text-neutral-700"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

export default function ProfilePreferencesPage() {
  const navigate = useNavigate();
  const { token, tenant } = useAuth();
  const profile = getCurrentUserProfile(token);
  const [preferences, setPreferences] = useState<PreferenceState>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPreferences(readPreferences());
  }, []);

  function updatePreference<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function submitPreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    writePreferences(preferences);
    setSaved(true);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          Back to Home
        </button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Profile & Preferences</h1>
            <div className="mt-1 text-sm font-semibold text-neutral-500">{profile.displayName || "User"}</div>
          </div>
          <div className="rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-700">
            Tenant: {tenant ?? "-"}
          </div>
        </div>
      </header>

      <main className="grid grid-cols-[minmax(0,1fr)_320px] gap-4 p-6">
        <section className="card p-4">
          <h2 className="text-lg font-semibold text-neutral-900">Profile</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <ProfileField label="Display Name" value={profile.displayName} />
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="Employee Code" value={profile.employeeCode} />
            <ProfileField label="Username" value={profile.username} />
            <ProfileField label="Tenant" value={tenant ?? ""} />
          </div>
        </section>

        <aside className="card h-fit p-4">
          <h2 className="text-sm font-semibold uppercase text-neutral-500">Preferences</h2>
          <form className="mt-4 space-y-5" onSubmit={submitPreferences}>
            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Theme</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["system", "light", "dark"] as const).map((theme) => (
                  <PreferenceOption
                    key={theme}
                    name="theme"
                    value={theme}
                    label={theme[0].toUpperCase() + theme.slice(1)}
                    checked={preferences.theme === theme}
                    onChange={(value) => updatePreference("theme", value as PreferenceState["theme"])}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-neutral-800">Density</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["compact", "comfortable"] as const).map((density) => (
                  <PreferenceOption
                    key={density}
                    name="density"
                    value={density}
                    label={density[0].toUpperCase() + density.slice(1)}
                    checked={preferences.density === density}
                    onChange={(value) => updatePreference("density", value as PreferenceState["density"])}
                  />
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(event) => updatePreference("emailNotifications", event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
              />
              Email notifications
            </label>

            {saved && (
              <div className="rounded-lg border border-primary-600 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-700">
                Preferences saved.
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full">
              Save Preferences
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}
