import { invoke } from '@forge/bridge';
import {
  defaultResolverFunctionKey,
  ProcedureCallOptions,
} from '@toolsplus/forge-trpc-protocol';
import type { CombinedDataTransformer, ProcedureType } from '@trpc/server';
import type { TRPCResponse } from '@trpc/server/dist/rpc';

// https://github.com/trpc/trpc/pull/669
function arrayToDict(array: unknown[]) {
  const dict: Record<number, unknown> = {};
  for (let index = 0; index < array.length; index++) {
    dict[index] = array[index];
  }
  return dict;
}

type GetInputOptions = {
  transformer: CombinedDataTransformer;
} & ({ input: unknown } | { inputs: unknown[] });

export function getInput(opts: GetInputOptions) {
  return 'input' in opts
    ? opts.transformer.input.serialize(opts.input)
    : arrayToDict(
        opts.inputs.map((_input) => opts.transformer.input.serialize(_input)),
      );
}

type CustomUiBridgeRequestOptions = GetInputOptions & {
  type: ProcedureType;
  path: string;
} & {
  resolverFunctionKey?: string;
  transformer: CombinedDataTransformer 
};

export const customUiBridgeRequest = <TResponseShape = TRPCResponse>(
  opts: CustomUiBridgeRequestOptions
): Promise<TResponseShape> => {
  const { type, path, resolverFunctionKey } = opts;

  const input = getInput(opts);
  const isBatchCall = 'inputs' in opts;
  const options: ProcedureCallOptions = {
    type,
    path,
    input,
    isBatchCall,
  };

  return invoke<TResponseShape>(
    resolverFunctionKey ?? defaultResolverFunctionKey,
    options
  );
};
