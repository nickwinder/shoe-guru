import { END, START, StateGraph } from '@langchain/langgraph'
import { ConfigurationAnnotation } from './configuration'
import { InputStateAnnotation, StateAnnotation } from './state'
import * as events from 'events'
import { respond } from './response'

events.EventEmitter.defaultMaxListeners = 1000

const builder = new StateGraph(
  {
    stateSchema: StateAnnotation,
    input: InputStateAnnotation,
  },
  ConfigurationAnnotation,
)
  .addNode('respond', respond)
  .addEdge(START, 'respond')
  .addEdge('respond', END)

export const graph = builder.compile({})

graph.name = 'Wide Toe Box Graph' // Customizes the name displayed in LangSmith
