import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular';

export interface ElectronBuilderSchema extends NormalizedBrowserBuilderSchema {
  electronProject: string;
}
