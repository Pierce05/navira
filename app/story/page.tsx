import { PageTitle } from '@/components/ui';
import { StoryCapture } from '@/components/story/StoryCapture';
export default function StoryPage() {
  return (<div><PageTitle title="Your story" intro="Speak or type. You can fix any word before anything is picked out." /><StoryCapture /></div>);
}
