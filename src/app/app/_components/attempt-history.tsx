import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  status: string;
  score_percent: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  started_at: string;
  attempt_number: number;
};

const fmt = (d: string) => new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function AttemptHistory({ attempts }: { attempts: Row[] }) {
  if (!attempts.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Riwayat percobaan</h2>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Skor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.attempt_number}</TableCell>
                <TableCell className="text-muted-foreground">{fmt(a.submitted_at ?? a.started_at)}</TableCell>
                <TableCell className="font-semibold tabular-nums">{a.score_percent !== null ? `${Number(a.score_percent)}%` : "–"}</TableCell>
                <TableCell>
                  {a.status === "in_progress" ? (
                    <Badge variant="outline">Berjalan</Badge>
                  ) : a.passed === null ? (
                    <Badge variant="secondary">Selesai</Badge>
                  ) : a.passed ? (
                    <Badge className="bg-success text-success-foreground">Lulus</Badge>
                  ) : (
                    <Badge variant="destructive">Belum lulus</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {a.status !== "in_progress" && (
                    <Link href={`/app/results/${a.id}`} className="text-sm font-medium text-primary hover:underline">
                      Lihat
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
