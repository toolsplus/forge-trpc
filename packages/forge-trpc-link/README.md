# @toolsplus/forge-trpc-link

Custom [tRPC link](https://trpc.io/docs/links) to enable tRPC for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) apps.

## Installation

```shell
npm install @toolsplus/forge-trpc-link
```

Note that this package has a peer dependency on `@forge/bridge`. If you have not installed `@forge/bridge` you may install before installing this package.

## Usage

You can import and add the `customUiBridgeLink` to the links array as follows:

```typescript
import { createTRPCProxyClient } from '@trpc/client';
import { customUiBridgeLink } from '@toolsplus/forge-trcp-link';
import type { HelloRouter } from '../my-trpc-server';

const client = createTRPCProxyClient<HelloRouter>({
  links: [
    customUiBridgeLink({
      resolverFunctionKey: 'rpc' 
    }),
  ],
});
```

## `customUiBridgeLink` options

The `customUiBridgeLink` function takes an options object that has the `CustomUiBridgeLinkOptions` shape.

```typescript
interface CustomUiBridgeLinkOptions {
  /**
   * Key of the Forge resolver function that handles tRPC 
   * requests from this link.
   * 
   * @defaultValue 'rpc'
   */
  resolverFunctionKey?: string;
}
```

