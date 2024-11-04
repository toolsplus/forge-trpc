import { TRPCClientRuntime } from '@trpc/client';
import type { ProcedureType } from '@trpc/server';
import type { TRPCResponse } from '@trpc/server/dist/rpc';
import { invoke } from '@forge/bridge';
import {
  defaultResolverFunctionKey,
  ProcedureCallOptions,
} from '@toolsplus/forge-trpc-protocol';

interface DataTransformer {
  serialize: (object: any) => any;
  deserialize: (object: any) => any;
}

// https://github.com/trpc/trpc/pull/669
function arrayToDict(array: unknown[]) {
  const dict: Record<number, unknown> = {};
  for (let index = 0; index < array.length; index++) {
    dict[index] = array[index];
  }
  return dict;
}

type GetInputOptions = {
  runtime: TRPCClientRuntime;
} & ({ inputs: unknown[] } | { input: unknown }) & {
    transformer: DataTransformer;
  };

function getInput(opts: GetInputOptions) {
  return 'input' in opts
    ? opts.transformer.serialize(opts.input)
    : arrayToDict(
        opts.inputs.map((_input) => opts.transformer.serialize(_input))
      );
}

type CustomUiBridgeRequestOptions = GetInputOptions & {
  type: ProcedureType;
  path: string;
} & {
  resolverFunctionKey?: string;
} & {
  transformer: DataTransformer;
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
