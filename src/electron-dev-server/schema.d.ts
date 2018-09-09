import { DevServerBuilderOptions } from "@angular-devkit/build-angular";

export interface ElectronServerBuilderOptions extends DevServerBuilderOptions {
  reloadOnChanges?: boolean;
}
