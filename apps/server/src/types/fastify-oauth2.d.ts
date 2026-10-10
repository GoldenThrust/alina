import '@fastify/oauth2'

declare module '@fastify/oauth2' {
  export const GOOGLE_CONFIGURATION: any
  export const FACEBOOK_CONFIGURATION: any
  export const X_CONFIGURATION: any
}
