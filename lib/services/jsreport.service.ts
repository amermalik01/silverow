// lib/services/jsreport.service.ts

export interface RenderReportOptions {
  /** The JSReport template shortid (e.g. "40Xj4YP3vZ") or name */
  templateShortId?: string;
  templateName?: string;
  /** The exact JSON payload expected by your JSReport template */
  data: Record<string, unknown>;
}

export class JsReportService {
  /**
   * Sends data to JSReport server and returns the raw Buffer (PDF)
   */
  static async renderPdf(options: RenderReportOptions): Promise<Buffer> {
    const { templateShortId, templateName, data } = options;

    if (!templateShortId && !templateName) {
      throw new Error(
        "JsReportService: Either templateShortId or templateName must be provided.",
      );
    }

    const jsreportUrl =
      process.env.JSREPORT_URL ||
      "https://rexenpk.jsreportonline.net/api/report";
    const user = process.env.JSREPORT_USER || "";
    const password = process.env.JSREPORT_PASSWORD || "";

    const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

    // Construct JSReport request payload
    const templatePayload: Record<string, unknown> = {};
    if (templateShortId) {
      templatePayload.shortid = templateShortId;
    } else if (templateName) {
      templatePayload.name = templateName;
    }

    const response = await fetch(jsreportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        template: templatePayload,
        data: {
          response: data, // Wrap payload in `response` key to match JSReport legacy conventions
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[JSREPORT_ERROR]:", errorText);
      throw new Error(
        `jsreport rendering failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
