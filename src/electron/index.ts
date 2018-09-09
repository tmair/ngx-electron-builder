import { BuilderConfiguration, BuildEvent } from '@angular-devkit/architect';
import { BrowserBuilder } from '@angular-devkit/build-angular';
import { combineLatest, Observable } from 'rxjs';
import { compile } from '../typescript';
import { ElectronBuilderSchema } from './schema';

export class ElectronBuilder extends BrowserBuilder {
  run(
    builderConfig: BuilderConfiguration<ElectronBuilderSchema>
  ): Observable<BuildEvent> {
    return combineLatest(
      super.run(builderConfig),
      this.compileTypescript(builderConfig),
      (angularEvent, typescriptEvent) => {
        return { success: angularEvent.success && typescriptEvent.success };
      }
    );
  }

  private compileTypescript(
    config: BuilderConfiguration<ElectronBuilderSchema>
  ) {
    return compile(config.options.electronProject);
  }

  // TODO run electron-builder after angular and typescript compilation are done
}

export default ElectronBuilder;
