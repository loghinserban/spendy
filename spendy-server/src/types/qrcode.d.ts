// Minimal declaration for the `qrcode` package to satisfy TypeScript builds
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | string;
    type?: string;
    quality?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }

  export function toDataURL(data: string, options?: QRCodeToDataURLOptions): Promise<string>;
  const _default: {
    toDataURL: typeof toDataURL;
  };
  export default _default;
}

