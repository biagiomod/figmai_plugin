import { Composition, registerRoot } from 'remotion'
import { AssistantVideo } from './AssistantVideo'
import { OverviewVideo } from './compositions/OverviewVideo'

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="AssistantVideo"
        component={AssistantVideo}
        durationInFrames={540}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ assistantId: 'general' }}
      />
      <Composition
        id="OverviewVideo"
        component={OverviewVideo}
        durationInFrames={1200}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  )
}

registerRoot(RemotionRoot)
