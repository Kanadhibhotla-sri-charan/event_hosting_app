import { Badge } from "@/components/ui/badge";

type Entry = {
  id: string;
  display: string;
  position?: number;
  badge?: string;
};

export function ParticipantList({
  title,
  entries,
  emptyText,
}: {
  title: string;
  entries: Entry[];
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between text-sm py-2 px-3 rounded-md bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right">
                  {entry.position ?? "—"}
                </span>
                <span>{entry.display}</span>
              </div>
              {entry.badge === "main_list_confirmed" && (
                <Badge variant="default" className="text-xs">Confirmed</Badge>
              )}
              {entry.badge === "waiting" && (
                <Badge variant="secondary" className="text-xs">Waiting</Badge>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
