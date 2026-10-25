/**
 * Shared server-backed journals. The Vite server stores each entry as one
 * JSON line in journals/*.txt, so all devices use the same history.
 */
export class ProtocolJournal {
  #successes = [];
  #failures = [];
  #serverAvailable = false;

  ready = fetch('/api/protocol-journal')
    .then(response => {
      if (!response.ok) throw new Error(`Journal server returned ${response.status}`);
      return response.json();
    })
    .then(data => {
      this.#successes = Array.isArray(data.successes) ? data.successes : [];
      this.#failures = Array.isArray(data.failures) ? data.failures : [];
      this.#serverAvailable = true;
    })
    .catch(error => {
      console.warn('Shared protocol journal unavailable:', error);
    });

  get successes() { return [...this.#successes]; }
  get failures() { return [...this.#failures]; }

  recordSuccess(entry) {
    this.#record('success', entry);
  }

  recordFailure(entry) {
    if (entry.result === 'phase-exhausted' && this.hasFailed(entry.sequenceKey)) return;
    this.#record('failure', entry);
  }

  hasFailed(sequenceKey, frequency = null) {
    return this.#failures.some(entry => {
      if (entry.sequenceKey !== sequenceKey) return false;
      if (entry.result === 'phase-exhausted') return true;
      return frequency !== null && entry.result === 'no-response' && entry.frequency === frequency;
    });
  }

  download(kind) {
    const entries = kind === 'success' ? this.#successes : this.#failures;
    const text = entries.map(entry => JSON.stringify(entry)).join('\n');
    const blob = new Blob([text ? `${text}\n` : ''], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${kind === 'success' ? 'successful' : 'unsuccessful'}-protocol-journal.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  #record(kind, entry) {
    const completeEntry = { ...entry, recordedAt: new Date().toISOString() };
    const entries = kind === 'success' ? this.#successes : this.#failures;
    entries.push(completeEntry);
    if (!this.#serverAvailable) {
      console.warn('Journal entry not saved: shared journal server is unavailable.');
      return;
    }
    fetch(`/api/protocol-journal/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completeEntry),
    }).catch(error => console.warn('Unable to append protocol journal:', error));
  }
}
