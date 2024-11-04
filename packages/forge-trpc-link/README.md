# @toolsplus/forge-trpc-link

Custom [tRPC link](https://trpc.io/docs/links) to enable tRPC for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) apps.

## Installation

```shell
npm install @toolsplus/forge-trpc-link
npm install superjson
```

Note that this package has a peer dependency on `@forge/bridge`. If you have not installed `@forge/bridge` you may install before installing this package.

## Usage

You can import and add the `customUiBridgeLink` to the links array as follows:

```typescript
// trpc-client.ts
import { createTRPCClient } from '@trpc/client';
import { customUiBridgeLink } from '@toolsplus/forge-trpc-link';
import type { HelloRouter } from '../my-trpc-server';
import superjson from 'superjson';

export const trpcClient = createTRPCClient<HelloRouter>({
  links: [
    customUiBridgeLink({
      resolverFunctionKey: 'rpc',
      transformer: superjson,
    }),
  ],
});
```

## Usage with @trpc/react-query (optional)
react-query is a popular library for managing server state in React applications. You can use `@trpc/react-query` to integrate tRPC with react-query.
You will need react-query 5 and React 18 to use this.

Instantiate the tRPC client with the `customUiBridgeLink` as shown below:
```typescript
// trpc-client.ts
import { createTRPCReact } from '@trpc/react-query';
import { customUiBridgeLink } from '@toolsplus/forge-trpc-link';
import type { HelloRouter } from '../my-trpc-server';
import superjson  from 'superjson';

export const trpcReact = createTRPCReact<HelloRouter>();
export const trpcReactClient = trpcReact.createClient({
  links: [
    customUiBridgeLink({
      resolverFunctionKey: 'rpc',
      transformer: superjson,
    }),
  ],
})
```
Wrap your application with the `TRPCProvider` as shown below:
```tsx
import { trpcReact, trpcReactClient } from "./trpc-client";

const queryClient = new QueryClient();

export default function App() {
  return (
    <trpcReact.Provider client={trpcReactClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        ... 
      </QueryClientProvider>
    </trpcReact.Provider>
  )
}
```
Then consume the typed queries and mutations in your components as shown below:
```tsx
const query = trpcReact.greeting.useQuery({ name: 'result from trpc provided query!' });
// or even use suspense
const suspenseQuery = trpcReact.greeting.useSuspenseQuery();
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
  /**
   * The transformer to use for serializing and deserializing 
   * tRPC requests and responses. You usually want to use superjson.
   *
   */
  transformer: {
    serialize: (object: any) => any;
    deserialize: (object: any) => any;
  };
}
```

