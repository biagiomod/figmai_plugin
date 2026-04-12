import { Composition, registerRoot } from 'remotion'
import { AssistantVideo } from './AssistantVideo'

export function RemotionRoot() {
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

registerRoot(RemotionRoot)
