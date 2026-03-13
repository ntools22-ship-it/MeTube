import { Download } from "lucide-react";

export default function Downloads() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Downloads</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Download className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No offline downloads yet</p>
        <p className="text-xs text-muted-foreground mt-1">Downloaded tracks will appear here for offline listening</p>
      </div>
    </div>
  );
}
