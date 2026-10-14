import { useEffect, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, House, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type AppTab = "home" | "stretch" | "booking" | "profile";

const steps = [
  { tab: "home", icon: House, title: "Make room for a little movement", text: "Check your sitting timer, take a stretch break, and watch your points and daily streak grow." },
  { tab: "stretch", icon: Activity, title: "Find your feel-good stretch", text: "Filter by body area. Open Details for pictures of each step, or start an exercise and finish its timer to earn 10 points." },
  { tab: "booking", icon: Stethoscope, title: "Meet your care team", text: "Choose a doctor profile, add a note about how you feel, and confirm your online appointment." },
  { tab: "profile", icon: UserRound, title: "Set a rhythm that suits you", text: "Choose your reminder interval and leave a star rating or suggestion whenever you like." },
] satisfies { tab: AppTab; icon: typeof House; title: string; text: string }[];

export function FirstLoginTour({ userId, onNavigate }: { userId: string | undefined; onNavigate: (tab: AppTab) => void }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);

  useEffect(() => {
    setStepIndex(null);
    if (!userId) return;
    try {
      if (window.localStorage.getItem(`unistretch:tour:v1:${userId}`) === "done") return;
    } catch { /* The tour still works when browser storage is unavailable. */ }
    setStepIndex(0);
    onNavigate("home");
  }, [userId, onNavigate]);

  function finish() {
    if (userId) {
      try { window.localStorage.setItem(`unistretch:tour:v1:${userId}`, "done"); } catch { /* Storage may be disabled. */ }
    }
    setStepIndex(null);
  }

  function move(index: number) {
    const next = steps[index];
    if (!next) return;
    setStepIndex(index);
    onNavigate(next.tab);
  }

  const step = stepIndex === null ? null : steps[stepIndex];
  if (!step || stepIndex === null) return null;
  const Icon = step.icon;

  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-description" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-primary/40 bg-card p-5 text-card-foreground shadow-[var(--shadow-mobile-nav)] sm:bottom-28 sm:left-auto sm:right-6 sm:mx-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-bold text-primary"><Icon className="size-4" /> {step.tab === "booking" ? "Doctors" : step.tab.charAt(0).toUpperCase() + step.tab.slice(1)} · {stepIndex + 1} of {steps.length}</span>
        <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>
      </div>
      <h2 id="tour-title" className="text-xl font-extrabold">{step.title}</h2>
      <p id="tour-description" className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
      <Progress value={((stepIndex + 1) / steps.length) * 100} className="my-4 h-1.5" />
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" disabled={stepIndex === 0} onClick={() => move(stepIndex - 1)}><ArrowLeft className="size-4" /> Back</Button>
        <Button variant="wellness" size="sm" onClick={() => stepIndex === steps.length - 1 ? finish() : move(stepIndex + 1)}>{stepIndex === steps.length - 1 ? "Get started" : "Next"}<ArrowRight className="size-4" /></Button>
      </div>
    </aside>
  );
}