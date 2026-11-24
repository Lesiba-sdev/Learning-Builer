"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActivityEditor, {
  activityProblem,
} from "../../../components/ActivityEditor";
import ActivityRenderer from "../../../components/ActivityRenderer";
import { ActivitySchema, type GeneratedActivity } from "../../../lib/schemas";
import { createBrowserSupabase } from "../../../lib/supabase";

type Status = "loading" | "missing" | "invalid" | "ready";

export default function EditClient({ id }: { id: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [activity, setActivity] = useState<GeneratedActivity | null>(null);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabase();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      const { data, error: loadError } = await supabase
        .from("activities")
        .select("user_id,title,type,content,is_published")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (loadError || !data || data.user_id !== userData.user.id) {
        setStatus("missing");
        return;
      }
      const parsed = ActivitySchema.safeParse({
        title: data.title,
        type: data.type,
        content: data.content,
        is_published: data.is_published,
      });
      if (!parsed.success) {
        setStatus("invalid");
        return;
      }
      setActivity(parsed.data);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function save() {
    if (!activity) return;
    const problem = activityProblem(activity);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: updateError } = await createBrowserSupabase()
      .from("activities")
      .update({
        title: activity.title,
        content: activity.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id");
    setSaving(false);
    if (updateError || !data || data.length === 0) {
      setError("Could not save your changes. Please try again.");
      return;
    }
    setSaved(true);
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-center">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  if (status !== "ready" || !activity) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-center">
        <h1 className="text-xl font-semibold">
          {status === "invalid"
            ? "This activity can't be edited"
            : "Activity not found"}
        </h1>
        <p className="mt-2 text-gray-600">
          {status === "invalid"
            ? "Its content isn't in a format the editor understands."
            : "It may have been deleted, or it belongs to another account."}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-blue-700 underline"
        >
          Back to my activities
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gray-50 py-3">
          <Link href="/dashboard" className="text-sm text-blue-700 underline">
            ← My activities
          </Link>
          <div className="flex items-center gap-3">
            {saved && (
              <span role="status" className="text-sm text-green-700">
                Saved ✓
              </span>
            )}
            <button
              onClick={save}
              disabled={saving || saved}
              className="min-h-[44px] rounded-xl bg-green-600 px-6 text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Edit activity</h1>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <ActivityEditor
              activity={activity}
              onChange={(next) => {
                setActivity(next);
                setVersion((v) => v + 1);
                setSaved(false);
                setError(null);
              }}
            />
          </div>

          <section className="mt-6 lg:mt-0 lg:sticky lg:top-20 lg:self-start">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <div className="mt-2 rounded-2xl border border-gray-200 bg-white py-4">
              <h3 className="px-4 text-center text-xl font-bold break-words">
                {activity.title}
              </h3>
              <p className="px-4 text-center text-gray-600 break-words">
                {activity.content.instructions}
              </p>
              <ActivityRenderer key={version} activity={activity} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}