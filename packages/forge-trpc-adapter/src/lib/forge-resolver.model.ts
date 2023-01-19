import Resolver from '@forge/resolver';

export type ResolverFunction = Parameters<Resolver['define']>[1];
export type Request = Parameters<ResolverFunction>[0];
export type Context = Request['context'];
export type Payload = Request['payload'];
export type Response = ReturnType<ResolverFunction>;
