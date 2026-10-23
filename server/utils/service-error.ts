/**
 * Domain errors raised by the service layer.
 *
 * Services never build HTTP responses; they raise one of these instead. The
 * routes translate the code into a status code.
 */
export type ServiceErrorCode = 'not_found' | 'forbidden'

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message?: string
  ) {
    super(message ?? code)
    this.name = 'ServiceError'
  }
}
