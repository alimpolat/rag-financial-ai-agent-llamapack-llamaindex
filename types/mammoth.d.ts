declare module "mammoth" {
  export interface MammothExtractResult {
    value: string;
    messages?: Array<{ type: string; message: string }>;
  }
  export function extractRawText(options: { path?: string; buffer?: Buffer }): Promise<MammothExtractResult>;
  const _default: any;
  export default _default;
}
