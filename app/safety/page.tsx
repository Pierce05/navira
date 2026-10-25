import { Card, LinkButton, PageTitle } from '@/components/ui';
import { EMERGENCY } from '@/lib/rules/redflags';

export default function SafetyPage() {
  return (
    <div className="max-w-3xl">
      <PageTitle title="Need urgent help?" intro="This page works offline. If something feels wrong right now, please do not wait for an app." />
      <Card className="mb-5">
        <h2 className="text-2xl">Contact a doctor or emergency services now if you have</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-lg">
          <li>Sudden, severe pelvic or belly pain, or pain with fainting or collapse</li>
          <li>Bleeding that soaks through a pad or tampon every hour for two hours or more, or bleeding with dizziness</li>
          <li>Pain or bleeding when you are pregnant or might be</li>
          <li>Pain with a high fever, or vomiting that will not stop</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3"><LinkButton href={`tel:${EMERGENCY.national}`}>Call {EMERGENCY.national} (India)</LinkButton></div>
      </Card>
      <Card className="mb-5">
        <h2 className="text-2xl">If you are thinking about harming yourself</h2>
        <p className="mt-2 text-lg">You do not have to carry this alone. In India you can call Tele-MANAS on {EMERGENCY.teleManas}, or {EMERGENCY.national} in an emergency. If you can, tell someone you trust where you are.</p>
        <div className="mt-4"><LinkButton href={`tel:${EMERGENCY.teleManas}`} variant="secondary">Call {EMERGENCY.teleManas}</LinkButton></div>
      </Card>
      <p className="text-muted">Navira cannot assess an emergency. Numbers shown are for India. Please check these numbers are current in your area.</p>
    </div>
  );
}
