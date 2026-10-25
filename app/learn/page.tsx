import { Card, PageTitle } from '@/components/ui';

const MYTHS: [string, string][] = [
  ['“Bad period pain is just part of being a woman.”', 'Some discomfort is common, but pain that stops you from school, work or sleep is worth raising with a clinician. It is a reason to be heard, not a reason to stay quiet.'],
  ['“If the ultrasound is normal, nothing is wrong.”', 'A normal scan does not rule everything out. Some conditions do not show on a routine ultrasound, so your own account of symptoms matters.'],
  ['“Irregular periods mean you did something wrong.”', 'Cycles vary for many reasons. A pattern of very long or very short cycles is something clinicians want to know about.'],
  ['“You have to be sure before you see a doctor.”', 'You do not. A clear history helps the doctor work out what to check. That is what the brief is for.'],
];
const SOURCES: [string, string][] = [
  ['NICE guideline NG73: Endometriosis', 'https://www.nice.org.uk/guidance/ng73'],
  ['ESHRE guideline on endometriosis', 'https://www.eshre.eu/Guidelines-and-Legal/Guidelines/Endometriosis-guideline'],
  ['International evidence-based guideline for PCOS', 'https://www.monash.edu/medicine/mchri/pcos'],
  ['WHO fact sheet on polycystic ovary syndrome', 'https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome'],
];

export default function Learn() {
  return (
    <div className="max-w-3xl">
      <PageTitle title="Good to know" intro="Short, plain notes. No numbers here until each one has been checked against its source." />
      <section aria-labelledby="mf" className="mb-8">
        <h2 id="mf" className="mb-3 text-2xl">Myth and fact</h2>
        <div className="grid gap-3">{MYTHS.map(([m, f]) => (
          <Card key={m}><p className="font-display text-xl">{m}</p><p className="mt-2">{f}</p></Card>
        ))}</div>
      </section>
      <section aria-labelledby="sup" className="mb-8">
        <h2 id="sup" className="mb-3 text-2xl">Everyday support</h2>
        <Card><ul className="list-disc space-y-2 pl-6">
          <li>Write down how bad it was and what it stopped you doing. Even a few words each time helps.</li>
          <li>Take someone you trust to the appointment if that feels easier.</li>
          <li>Ask your clinician what is safe for you before trying new remedies or medicines.</li>
          <li>It is fine to ask for a second opinion.</li>
        </ul></Card>
      </section>
      <section aria-labelledby="src">
        <h2 id="src" className="mb-3 text-2xl">Where the rules come from</h2>
        <ul className="list-disc space-y-1 pl-6">{SOURCES.map(([n, u]) => <li key={u}><a className="text-accent-strong underline underline-offset-4" href={u} rel="noopener noreferrer" target="_blank">{n}</a></li>)}</ul>
        <p className="mt-3 text-sm text-muted">Links open in a new tab and leave this app. Nothing from your story is sent.</p>
      </section>
    </div>
  );
}
