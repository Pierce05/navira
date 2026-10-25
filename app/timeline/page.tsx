import { PageTitle } from '@/components/ui';
import { TimelineView } from '@/components/timeline/TimelineView';
export default function TimelinePage() {
  return (<div><PageTitle title="Your timeline" intro="Built only from what you confirmed. Anything unknown is shown as unknown." /><TimelineView /></div>);
}
