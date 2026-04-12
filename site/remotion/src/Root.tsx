import { Composition } from 'remotion'
import { AssistantVideo } from './AssistantVideo'

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AssistantVideo"
      component={AssistantVideo}
      durationInFrames={540}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{ assistantId: 'general' }}
    />
  )
}
