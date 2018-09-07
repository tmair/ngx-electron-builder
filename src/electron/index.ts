import { BuilderConfiguration, BuildEvent } from '@angular-devkit/architect';
import { BrowserBuilder, BrowserBuilderSchema } from '@angular-devkit/build-angular';
import { spawn } from 'child_process';
import { combineLatest, Observable, of } from 'rxjs';

export class ElectronBuilder extends BrowserBuilder {
  run(
    builderConfig: BuilderConfiguration<BrowserBuilderSchema>
  ): Observable<BuildEvent> {
    return combineLatest(
      super.run(builderConfig),
      this.runElectron(),
      angularEvent => angularEvent
    );
  }

  private runElectron(): Observable<BuildEvent> {
    const electron = require('electron');
    const electronProcess = spawn(electron);
    electronProcess.on('exit', code => process.exit(code));

    return of({ success: true });
  }
}

export default ElectronBuilder;
