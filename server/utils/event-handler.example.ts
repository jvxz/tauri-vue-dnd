import type { EventHandlerRequest, EventHandlerResponse, H3Event } from 'h3'

export interface AuthedEventHandlerContext {
  context: {
    authData: {
      username: string
      email: string
      role: string
    }
  }
}

type AuthedEventHandler<T extends EventHandlerRequest, D extends EventHandlerResponse> = (event: H3Event<T> & AuthedEventHandlerContext) => Promise<D>

export function defineAuthedEventHandler<T extends EventHandlerRequest, D>(handler: AuthedEventHandler<T, D>) {
  return defineEventHandler(async (event) => {
    if (!event.context.authData) {
      throw createError({
        message: 'Unauthorized',
        statusCode: 401,
        statusMessage: 'Unauthorized: no auth data',
      })
    }

    return await handler(event as H3Event<T> & AuthedEventHandlerContext)
  })
}
