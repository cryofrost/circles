import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

const FILES = {
  success: 'successful-protocol-journal.txt',
  failure: 'unsuccessful-protocol-journal.txt',
};

/**
 * Uses app-private files on Android and the shared Vite API in a browser.
 * Android journal files live in the app's Data directory and are not shared
 * between devices or removed until the app is uninstalled.
 */
export class ProtocolJournal {
  #successes = [];
  #failures = [];
  #native = Capacitor.isNativePlatform();
  #storageAvailable = false;

  ready = this.#initialise();

  get successes() { return [...this.#successes]; }
  get failures() { return [...this.#failures]; }

  recordSuccess(entry) { this.#record('success', entry); }

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

  async #initialise() {
    if (this.#native) {
      this.#successes = await this.#readLocal('success');
      this.#failures = await this.#readLocal('failure');
      this.#storageAvailable = true;
      return;
    }
    try {
      const response = await fetch('/api/protocol-journal');
      if (!response.ok) throw new Error(`Journal server returned ${response.status}`);
      const data = await response.json();
      this.#successes = Array.isArray(data.successes) ? data.successes : [];
      this.#failures = Array.isArray(data.failures) ? data.failures : [];
      this.#storageAvailable = true;
    } catch (error) {
      console.warn('Shared protocol journal unavailable:', error);
    }
  }

  async #readLocal(kind) {
    try {
      const result = await Filesystem.readFile({
        path: FILES[kind],
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return String(result.data).split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  #record(kind, entry) {
    const completeEntry = { ...entry, recordedAt: new Date().toISOString() };
    const entries = kind === 'success' ? this.#successes : this.#failures;
    entries.push(completeEntry);
    if (!this.#storageAvailable) {
      console.warn('Journal entry not saved: journal storage is unavailable.');
      return;
    }
    if (this.#native) {
      this.#appendLocal(kind, completeEntry);
      return;
    }
    fetch(`/api/protocol-journal/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(completeEntry),
    }).catch(error => console.warn('Unable to append protocol journal:', error));
  }

  async #appendLocal(kind, entry) {
    const line = `${JSON.stringify(entry)}\n`;
    try {
      await Filesystem.appendFile({ path: FILES[kind], directory: Directory.Data, data: line, encoding: Encoding.UTF8 });
    } catch {
      await Filesystem.writeFile({ path: FILES[kind], directory: Directory.Data, data: line, encoding: Encoding.UTF8 });
    }
  }
}
