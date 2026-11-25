import * as artifact from './artifact.js';
import * as server from './http.js';

// `npm run dev` / `npm start` talk to the Express API; the artifact build talks to claude.ai.
const impl = import.meta.env.MODE === 'artifact' ? artifact : server;

export const analyze = impl.analyze;
export const assessScenario = impl.assessScenario;
export const getStatus = impl.getStatus;
export const isArtifact = import.meta.env.MODE === 'artifact';
export const listCustomScenarios = impl.listCustomScenarios;
export const saveCustomScenario = impl.saveCustomScenario;
export const deleteCustomScenario = impl.deleteCustomScenario;
export const duplicateScenario = impl.duplicateScenario;
