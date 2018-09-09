import * as fs from 'fs';
import * as path from 'path';
import { Observable, of, throwError } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import * as ts from 'typescript';

function reportDiagnostics(diagnostics: (ts.Diagnostic | undefined)[]): void {
  diagnostics
    .filter(
      (diag: ts.Diagnostic | undefined): diag is ts.Diagnostic =>
        diag !== undefined
    )
    .forEach(diagnostic => {
      let message = 'Error';
      if (diagnostic.file) {
        let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start || 0
        );
        message += ` ${diagnostic.file.fileName} (${line + 1},${character +
          1})`;
      }
      message +=
        ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.log(message);
    });
}

export function readConfigFile(
  configFileName: string
): Observable<ts.ParsedCommandLine> {
  // Read config file
  const configFileText = fs.readFileSync(configFileName).toString();

  // Parse JSON, after removing comments. Just fancier JSON.parse
  const result = ts.parseConfigFileTextToJson(configFileName, configFileText);
  const configObject = result.config;
  if (!configObject) {
    reportDiagnostics([result.error]);
    return throwError(result.error);
  }

  // Extract config infromation
  const configParseResult = ts.parseJsonConfigFileContent(
    configObject,
    ts.sys,
    path.dirname(configFileName)
  );
  if (configParseResult.errors.length > 0) {
    reportDiagnostics(configParseResult.errors);
    return throwError(configParseResult.errors);
  }

  configParseResult.options.outDir = 'dist/electron';
  configParseResult.options.out = undefined;

  return of(configParseResult);
}

export function compile(configFileName: string) {
  // Extract configuration from config file
  return readConfigFile(configFileName).pipe(
    map(config => ts.createProgram(config.fileNames, config.options)),
    map(program => [program.emit(), ts.getPreEmitDiagnostics(program)]),
    tap(([emitResult, preDiagnostics]: [ts.EmitResult, ts.Diagnostic[]]) =>
      reportDiagnostics(preDiagnostics.concat(emitResult.diagnostics))
    ),
    map(([emitResult]) => {
      return { success: emitResult.emitSkipped };
    })
  );
}
