import { useState } from "react";
import { Activity, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import neckOne from "@/assets/stretch-neck-step-1.jpg";
import neckTwo from "@/assets/stretch-neck-step-2.jpg";
import neckThree from "@/assets/stretch-neck-step-3.jpg";
import backOne from "@/assets/stretch-back-step-1.jpg";
import backTwo from "@/assets/stretch-back-step-2.jpg";
import backThree from "@/assets/stretch-back-step-3.jpg";
import wristOne from "@/assets/stretch-wrist-step-1.jpg";
import wristTwo from "@/assets/stretch-wrist-step-2.jpg";
import wristThree from "@/assets/stretch-wrist-step-3.jpg";

const guides = [
  {
    name: "Neck reset",
    steps: [
      { image: neckOne, title: "Sit tall", time: "5 slow breaths", text: "Rest your hands on your thighs. Look straight ahead and let your shoulders drop.", alt: "Seated upright with a neutral neck and relaxed shoulders" },
      { image: neckTwo, title: "Tilt gently to the side", time: "10–15 sec each side", text: "Bring one ear toward your shoulder without lifting the shoulder. Return to the middle, then switch sides. Do not pull your head.", alt: "Gentle sideways neck tilt with shoulders relaxed" },
      { image: neckThree, title: "Return to the middle", time: "5 slow breaths", text: "Bring your head upright again. Relax your jaw and shoulders before repeating the gentle side bends.", alt: "Head returned to an upright neutral position after the side bend" },
    ],
  },
  {
    name: "Lower back flow",
    steps: [
      { image: backOne, title: "Find a steady seat", time: "5 slow breaths", text: "Place both feet flat on the floor, hip-width apart. Sit tall with your hands resting on your thighs.", alt: "Upright seated posture with both feet flat and hands on thighs" },
      { image: backTwo, title: "Gently round your back", time: "Exhale slowly", text: "Breathe out and gently round your upper back. Let your chin lower slightly, keeping your hips on the seat.", alt: "Seated gentle back rounding with the chin slightly lowered" },
      { image: backThree, title: "Open your chest", time: "Repeat 5–8 times", text: "Breathe in, sit tall and gently lift your chest. Keep the movement small. Alternate with the rounded position without forcing your lower back.", alt: "Seated tall with the chest gently lifted and feet on the floor" },
    ],
  },
  {
    name: "Wrist break",
    steps: [
      { image: wristOne, title: "Open your hands", time: "5 gentle repetitions", text: "Relax your shoulders. Spread your fingers comfortably, then relax them. Keep your wrists loose.", alt: "Both hands open with fingers comfortably spread" },
      { image: wristTwo, title: "Fingers point up", time: "10–15 sec each hand", text: "Reach one arm forward with a soft elbow. Point your fingers up and gently ease them back with your other hand. Switch hands.", alt: "One arm extended with fingers up and the other hand gently supporting the fingers" },
      { image: wristThree, title: "Fingers point down", time: "10–15 sec each hand", text: "Point your fingers down. Use your other hand to gently ease the back of your hand toward you. Keep your elbow soft, then switch hands.", alt: "One arm extended with fingers pointing down and the other hand supporting the back of the hand" },
    ],
  },
];

export function StretchStepGuide({ initialIndex = 0, showSelector = true }: { initialIndex?: number; showSelector?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const guide = guides[selectedIndex] ?? guides[0];
  if (!guide) return null;

  return (
    <section aria-labelledby="stretch-steps-heading" className="mb-8 min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-primary"><Activity className="size-4" /> Movement guide</p>
          <h3 id="stretch-steps-heading" className="mt-2 text-2xl font-black">Stretch, step by step</h3>
        </div>
        {showSelector && <div role="group" aria-label="Choose a movement guide" className="flex flex-wrap gap-2">
          {guides.map((item, index) => (
            <Button key={item.name} variant={selectedIndex === index ? "wellness" : "outline"} size="sm" aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)}>{item.name}</Button>
          ))}
        </div>}
      </div>
      <ol aria-label={`${guide.name} exercise steps`} className="grid gap-4 md:grid-cols-3">
        {guide.steps.map((step, index) => (
          <li key={step.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="relative aspect-square overflow-hidden bg-muted">
              <img src={step.image} alt={step.alt} width={512} height={512} loading="lazy" className="h-full w-full object-contain" />
              <span className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-primary text-base font-black text-primary-foreground" aria-label={`Step ${index + 1}`}>{index + 1}</span>
            </div>
            <div className="space-y-2 p-5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-primary"><Clock3 className="size-3.5 shrink-0" />{step.time}</p>
              <h4 className="text-lg font-extrabold">{step.title}</h4>
              <p className="text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Move slowly and breathe normally. You should feel a gentle stretch, not pain. Stop if you feel pain, tingling or dizziness.</p>
    </section>
  );
}