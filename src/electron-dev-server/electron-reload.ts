import { BuildEvent } from '@angular-devkit/architect';
import { spawn } from 'child_process';
import * as chokidar from 'chokidar';
import { Observable } from 'rxjs';

// we need to import electron via require to be able to call it to start electron
const electron = require('electron');

export function runElectronWatcher(
  mainFile: string,
  outputDir: string
): Observable<BuildEvent> {
  return new Observable(obs => {
    let electronProcess = spawn(electron as any, [mainFile]);
    electronProcess.on('exit', processExitListener);

    const watcher = chokidar.watch(`${outputDir}/**/*`, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    watcher.on('change', evt => {
      if (electronProcess) {
        electronProcess.removeListener('exit', processExitListener);
        electronProcess.kill();
      }
      electronProcess = spawn(electron as any, [mainFile]);
      electronProcess.on('exit', processExitListener);
      obs.next({ success: true });
    });

    process.on('exit', () => watcher.close());

    obs.next({ success: true });

    return () => {
      watcher.close();
      if (electronProcess) {
        electronProcess.removeListener('exit', processExitListener);
        electronProcess.kill();
      }
    };
  });
}

function processExitListener(code: number) {
  process.exit(code);
}
