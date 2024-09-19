import { CustomWorld } from 'reinarpg-server/dist/lib/modules/world'
import { IndexedData } from 'reinarpg-data'
import { MesherConfig } from '../../viewer/lib/mesher/shared'

type SetupParams = {}
export type ExampleSetupFunction = (world: CustomWorld, mcData: IndexedData, mesherConfig: MesherConfig, setupParam: SetupParams) => void
