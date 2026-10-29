/** Error controlado con estado HTTP y código estable para la app. */
export class AppError extends Error {
  /** Construye un error seguro para mostrar al usuario. */
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
