import FaultLineCloudCompanion, {
  FaultLineCompanionIcon,
  POKE_QUOTES,
  THINKING_QUOTES,
  DONE_QUOTES,
  CONTEXT_QUOTES,
} from './FaultLineCloudCompanion.jsx';

/**
 * CodexCompanion
 *
 * Backward-compatible wrapper around FaultLineCloudCompanion.
 * All existing imports and test suites referencing CodexCompanion continue to work seamlessly.
 */
export {
  FaultLineCompanionIcon,
  POKE_QUOTES,
  THINKING_QUOTES,
  DONE_QUOTES,
  CONTEXT_QUOTES,
};

export default function CodexCompanion(props) {
  return <FaultLineCloudCompanion {...props} />;
}
