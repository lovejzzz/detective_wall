export interface CommonsResult {
  file: string;
  description: string;
  date?: string;
  author?: string;
  license?: string;
  width: number;
  height: number;
  page: string;
}
export function plain(html: unknown): string;
export function searchCommonsPhotos(query: string, limit?: number, fetchImpl?: typeof fetch): Promise<CommonsResult[]>;
export const FIND_PHOTOS: {
  name: "find_photos";
  description: string;
  input_schema: { type: "object"; additionalProperties: false; required: ["query"]; properties: Record<string, { type: string; description: string }> };
};
