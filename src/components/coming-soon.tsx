import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="mt-4 font-display text-xl">Em construção</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
