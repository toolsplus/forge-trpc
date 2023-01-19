# @toolsplus/forge-trpc-adapter

Custom [tRCP adapter](https://trpc.io/docs/adapters) to enable tRPC for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) apps.

## Installation

```shell
npm install @toolsplus/forge-trpc-adapter
```

Note that this package has a peer dependency on `@forge/resolver`. If you have not installed `@forge/resolver` you may install before installing this package.

## Usage

The following code illustrates how to create a Forge function that handles tRPC requests.

```typescript
// src/index.ts
import Resolver from '@forge/resolver';
import {
  initTRPC,
  inferAsyncReturnType
} from '@trpc/server';
import {
  forgeRequestHandler,
  ResolverFunction,
  CreateForgeContextOptions
} from '@toolsplus/forge-trcp-adapter';
import { z } from 'zod';

// Initialize a context for the server
const createContext = ({ request }: CreateForgeContextOptions) => {
    // For production applications you may want to validate
    // that `request.context` is in the expected format. This
    // should also help with better Typescript type inference.
    return request.context;
}

// Get the context type
type Context = inferAsyncReturnType<typeof createContext>;

const tRPC = initTRPC.context<Context>().create();

// Create hello router
const helloRouter = tRPC.router({
  // Hello procedure
  greeting: tRPC.procedure
    .input(
      z.object({
        name: z.string(),
      }),
    )
    .query(({ input }) => `Hello, ${input.name}!`),
});

// Export the hello router type to be imported on the client side
export type HelloRouter = typeof helloRouter;

// Create a Forge function request handler that resolves
// tRPC requests
const helloResolver: ResolverFunction = forgeRequestHandler({
  router: helloRouter,
  createContext,
});

// Register the tRPC request resolver with the 'rpc' Forge 
// function key
export const tRPCResolver = new Resolver()
  .define('rpc', helloResolver)
  .getDefinitions();
```

Register the `tRPCResolver` function in the Forge app manifest, just as you would any other Forge resolver function.

```yaml
# manifest.yml
modules:
  jira:projectSettingsPage:
    - key: project-settings-page
      title: Hello tRPC
      layout: blank
      resource: hello-trpc
      resolver:
        function: trpc-resolver
  function:
    - key: trpc-resolver
      handler: index.tRPCResolver
resources:
  - key: hello-trpc
    path: hello-trpc
    tunnel:
      port: 4200
app:
  id: ari:cloud:ecosystem::app/...
```
