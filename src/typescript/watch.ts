import { BuildEvent } from '@angular-devkit/architect';
import { Observable, Subscriber } from 'rxjs';
import ts = require('typescript');

// See https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#writing-an-incremental-program-watcher for how to write a watcher

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};

export function watch(configFile: string) {
  return new Observable((subscriber: Subscriber<BuildEvent>) => {
    let errors = 0;
    let compiling = false;

    if (!configFile) {
      throw new Error(
        `Could not find a valid configuration file at location ${configFile}.`
      );
    }

    // TypeScript can use several different program creation "strategies":
    //  * ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    //  * ts.createSemanticDiagnosticsBuilderProgram
    //  * ts.createAbstractBuilder
    // The first two produce "builder programs". These use an incremental strategy
    // to only re-check and emit files whose contents may have changed, or whose
    // dependencies may have changes which may impact change the result of prior
    // type-check and emit.
    // The last uses an ordinary program which does a full type check after every
    // change.
    // Between `createEmitAndSemanticDiagnosticsBuilderProgram` and
    // `createSemanticDiagnosticsBuilderProgram`, the only difference is emit.
    // For pure type-checking scenarios, or when another tool/process handles emit,
    // using `createSemanticDiagnosticsBuilderProgram` may be more desirable.
    const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;

    // Note that there is another overload for `createWatchCompilerHost` that takes
    // a set of root files.
    const host = ts.createWatchCompilerHost(
      configFile,
      {},
      ts.sys,
      createProgram as ts.CreateProgram<ts.BuilderProgram>,
      reportDiagnostic,
      reportWatchStatusChanged
    );

    // You can technically override any given hook on the host, though you probably
    // don't need to.
    // Note that we're assuming `origCreateProgram` and `origPostProgramCreate`
    // doesn't use `this` at all.
    const origCreateProgram = host.createProgram;
    host.createProgram = (
      rootNames: ReadonlyArray<string> | undefined,
      options,
      host,
      oldProgram
    ) => {
      console.log('Compiling electron main process files...');
      errors = 0;
      compiling = true;
      return origCreateProgram(rootNames, options, host, oldProgram);
    };
    const origPostProgramCreate = host.afterProgramCreate;

    host.afterProgramCreate = program => {
      origPostProgramCreate!(program);
      console.log('Compilation done');
      if (compiling) {
        subscriber.next({ success: errors === 0 });
      }
      compiling = false;
      errors = 0;
    };

    // `createWatchProgram` creates an initial program, watches files, and updates
    // the program over time.
    ts.createWatchProgram(host);

    function reportDiagnostic(diagnostic: ts.Diagnostic) {
      errors++;
      console.error(
        'Error',
        diagnostic.code,
        ':',
        ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          formatHost.getNewLine()
        )
      );
    }

    /**
     * Prints a diagnostic every time the watch status changes.
     * This is mainly for messages like "Starting compilation" or "Compilation completed".
     */
    function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
      console.info(ts.formatDiagnostic(diagnostic, formatHost));
    }
  });
}
