import { Composition, registerRoot } from 'remotion'
import { AssistantVideo } from './AssistantVideo'
import { OverviewVideo } from './compositions/OverviewVideo'
import { StrikeTeamVideo } from './compositions/StrikeTeamVideo'
import { CoreTeamVideo } from './compositions/CoreTeamVideo'

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
      <Composition
        id="StrikeTeamVideo"
        component={StrikeTeamVideo}
        durationInFrames={12600}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="CoreTeamVideo"
        component={CoreTeamVideo}
        durationInFrames={23400}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  )
}

registerRoot(RemotionRoot)
