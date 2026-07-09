import { Button } from "@/components/ui/button";
import { RecordExercise } from "@/components/record-exercise";
import Link from "next/link";

export default async function RecordPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    type?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/doctor">
          <Button variant="outline">Back</Button>
        </Link>

        <RecordExercise
          defaultName={params.name ?? ""}
          defaultType={params.type ?? "knee-extension"}
          doneLabel="Back to Dashboard"
        />
      </div>
    </main>
  );
}