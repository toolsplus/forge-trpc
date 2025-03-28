# Forge tRPC

[![Release](https://github.com/toolsplus/forge-trpc/actions/workflows/release.yml/badge.svg?branch=main)](https://github.com/toolsplus/forge-trpc/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/@toolsplus/forge-trpc-adapter?style=flat&logo=npm)](https://www.npmjs.com/package/@toolsplus/forge-trpc-adapter)

Forge tRPC provides a custom [tRCP adapter](https://trpc.io/docs/adapters) and a custom [tRPC link](https://trpc.io/docs/links) to enable [tRPC](https://trpc.io/) on [Atlassian Forge](https://developer.atlassian.com/platform/forge/) apps. 


## Overview

Forge tRPC consists of the following two parts:  

### @toolsplus/forge-trpc-adapter

A custom tRPC adapter that allows you to configure any Forge function to handle tRPC requests over the Forge Custom UI bridge. Have a look at the usage example in the [@toolsplus/forge-trpc-adapter README](packages/forge-trpc-adapter/README.md#Usage) to get started. 

### @toolsplus/forge-trpc-link

A custom, terminating tRPC link that routes tRPC requests over the Forge Custom UI bridge to the configured Forge function key. Have a look at the usage example in the [@toolsplus/forge-trpc-adapter README](packages/forge-trpc-link/README.md#Usage) to get started.

For details on how to use tRPC in general and how to configure adapters and links have a look at the [tRPC documentation](https://trpc.io/docs). 

## Limitations

[Subscriptions](https://trpc.io/docs/subscriptions) are currently not supported, even though it is currently still in the API. We may remove this from the API interface at a later stage.

## Motivation

Atlassian Forge provides a simple Javascript API ([bridge](https://developer.atlassian.com/platform/forge/custom-ui/#bridge)) that enables Custom UI apps to make secure requests to Forge app functions. To make a request from a Custom UI to a Forge function a developer needs to provide the function key as a string argument plus any function arguments that the Forge function expects. The problem with this approach is that it is up to developers to make sure they establish and follow a consistent contract (API) between their Custom UI and Forge function handler. Here are some questions that have to be answered when establishing the API contract:
* Do you use a different function for each "API endpoint" or the same function for all endpoints but distinguish them via the payload?
* What should the API payload look like?
* How do you make sure you are sending the right payload to the function, i.e. ensure type safety, or make sure the client and server are speaking the same language?

**The case for GraphQL**

GraphQL is one answer to the questions above. It does a great job at helping developers establish a consistent API contract between the client and server and has strong community support with lots of tooling available for code generation. But in here also lies the motivation for Forge tRPC: GraphQL is using its own language-agnostic type system which typically requires tooling to generate types and/or code.

**The case for tRPC**

With tRPC we get the same benefits as with GraphQL and more (minus the code generation part):

* Automatic type-safety: tRPC relies on Typescript to ensure that client code (Custom UI) and server code (Forge function/resolvers) are always in sync. A breaking change to the API of a Forge function, fails the compilation of the Custom UI code (without generating additional code!).
* Simple: tRPC solely relies on Typescript to ensure the client-server contract is valid - no code generators, no schema declarations required.
* Performance: tRPC has great support for server-side rendering. If the Forge ecosystem supports server-side rendering, I am sure tRPC will be able to leverage that.
* Developer ergonomics: Through the tRCP interface, IDEs will provide code completion for available Forge functions and even support jump-to-source (server) from Custom UI code.

## tRPC v11
Starting version 1.0.0 this packages supports [tRPC v11](https://trpc.io/docs/migrate-from-v10-to-v11). This package is currently tested with 11.0.0. Be aware that you'll need to use React 18.x to use tRPC 11.x with react-query 5.x. If you spot any issues with tRPC 11.x please open an issue. 
