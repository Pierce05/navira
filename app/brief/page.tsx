import { PageTitle } from '@/components/ui';
import { BriefEditor } from '@/components/brief/BriefEditor';
export default function BriefPage() {
  return (<div><PageTitle title="Your brief" intro="One page your clinician can read in about thirty seconds. Edit anything before you download." /><BriefEditor /></div>);
}
