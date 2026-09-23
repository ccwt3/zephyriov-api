/** Browser lifecycle only: never parses or installs a session from a deep link. */
export function createReturnGate(target) {
  let pending = false;
  return {
    begin() { pending = true; },
    cancel() { pending = false; },
    accept(url) {
      if (!pending || url !== target) return false;
      pending = false;
      return true;
    },
  };
}
