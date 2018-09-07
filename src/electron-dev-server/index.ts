import { BuilderConfiguration, BuildEvent } from '@angular-devkit/architect';
import { DevServerBuilder as DevServerBuilderBase, DevServerBuilderOptions } from '@angular-devkit/build-angular';
import { spawn } from 'child_process';
import * as path from 'path';
import { combineLatest, Observable } from 'rxjs';
import { concatMap, map, share, take } from 'rxjs/operators';
import { ElectronBuilderSchema } from '../electron/schema';
import { compile, readConfigFile } from './typescript';

export class DevServerBuilder extends DevServerBuilderBase {
  run(
    builderConfig: BuilderConfiguration<DevServerBuilderOptions>
  ): Observable<BuildEvent> {
    const angularBuilder = super.run(builderConfig).pipe(share());
    const config = this.getBuilderConfiguration(builderConfig);
    const typescript = this.runTypescript(config).pipe(share());

    const runElectron = combineLatest(
      angularBuilder.pipe(take(1)),
      typescript.pipe(take(1))
    ).pipe(concatMap(e => this.runElectron(config)));

    return combineLatest(
      // TODO watch mode for typescript
      angularBuilder,
      runElectron,
      (typescriptResult, angularBuilderResult) => {
        return {
          success: typescriptResult.success && angularBuilderResult.success
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
    config: BuilderConfiguration<ElectronBuilderSchema>
  ) {
    return compile(config.options.electronProject);
  }

  private getBuilderConfiguration( builderConfig: BuilderConfiguration<DevServerBuilderOptions>) {
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
