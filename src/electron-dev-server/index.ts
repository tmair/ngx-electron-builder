import { Builder, BuilderConfiguration, BuildEvent } from '@angular-devkit/architect';
import { DevServerBuilder as DevServerBuilderBase, DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { spawn } from 'child_process';
import * as path from 'path';
import { combineLatest, Observable } from 'rxjs';
import { first, map, shareReplay, switchMap } from 'rxjs/operators';
import { ElectronBuilderSchema } from '../electron/schema';
import { compile, readConfigFile, watch } from '../typescript';
import { ElectronServerBuilderOptions } from './schema';

export class DevServerBuilder extends DevServerBuilderBase
  implements Builder<ElectronBuilderSchema> {
  run(
    builderConfig: BuilderConfiguration<ElectronServerBuilderOptions>
  ): Observable<BuildEvent> {
    const config = this.getBuilderConfiguration(builderConfig);
    const startWatcher: boolean = builderConfig.options.reloadOnChanges || false;

    const angularBuilder = super.run(builderConfig).pipe(shareReplay(1));
    const typescript = this.runTypescript(config, startWatcher).pipe(
      shareReplay(1)
    );

    const runElectron = combineLatest(
      angularBuilder.pipe(first()),
      typescript.pipe(first())
    ).pipe(switchMap(e => this.runElectron(config)));

    return combineLatest(
      typescript,
      angularBuilder,
      runElectron,
      (typescriptResult, angularBuilderResult, runElectronResult) => {
        return {
          success:
            typescriptResult.success &&
            angularBuilderResult.success &&
            runElectronResult.success
        };
      }
    );
  }

  private runElectron(
    config: BuilderConfiguration<ElectronBuilderSchema>
  ): Observable<BuildEvent> {
    const electron = require('electron');

    return readConfigFile(config.options.electronProject).pipe(
      map(config => {
        if (config.fileNames.length !== 1) {
          throw new Error('Multiple entry files for electron process');
        }

        return path.resolve(
          config.options.outDir || '',
          config.fileNames[0].replace(/\.ts$/, '.js')
        );
      }),
      map(outputPath => {
        const options = [outputPath];

        const electronProcess = spawn(electron, options);
        electronProcess.on('exit', code => process.exit(code));

        return { success: true };
      })
    );
  }

  private runTypescript(
    config: BuilderConfiguration<ElectronBuilderSchema>,
    startWatcher: boolean = false
  ) {
    if (startWatcher) {
      return watch(config.options.electronProject);
    } else {
      return compile(config.options.electronProject);
    }
  }

  private getBuilderConfiguration(
    builderConfig: BuilderConfiguration<DevServerBuilderOptions>
  ): BuilderConfiguration<ElectronBuilderSchema> {
    const [project, targetName, configuration] = (builderConfig.options
      .browserTarget as string).split(':');
    const targetSpec = {
      project,
      target: targetName,
      configuration
    };
    return this.context.architect.getBuilderConfiguration<
      ElectronBuilderSchema
    >(targetSpec);
  }
}

export default DevServerBuilder;
