import { Suspense } from "react";
import EditClient from "./EditClient";

async function Loaded({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditClient id={id} />;
}

export default function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 p-8 text-center">
          <p className="text-gray-600">Loading…</p>
        </main>
      }
    >
      <Loaded params={params} />
    </Suspense>
  );
}