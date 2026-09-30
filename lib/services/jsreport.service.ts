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

  static async pingServer(): Promise<{ ok: boolean; status: number; message: string }> {
    const jsreportUrl =
      process.env.JSREPORT_URL || "https://rexenpk.jsreportonline.net/api/report";
    const user = process.env.JSREPORT_USER || "";
    const password = process.env.JSREPORT_PASSWORD || "";
    const authHeader = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

    // Ping /api/version or /api/ping
    const baseUrl = jsreportUrl.replace(/\/api\/report\/?$/, "");
    const pingUrl = `${baseUrl}/api/ping`;

    try {
      console.log(`[JSREPORT_DIAGNOSTIC]: Pinging JSReport server at ${pingUrl}...`);
      const res = await fetch(pingUrl, {
        headers: { Authorization: authHeader },
      });
      console.log(`[JSREPORT_DIAGNOSTIC]: Server Ping Status -> ${res.status}`);
      return {
        ok: res.ok,
        status: res.status,
        message: await res.text(),
      };
    } catch (err: unknown) {
      console.error("[JSREPORT_DIAGNOSTIC_ERROR]: Ping failed:", err);
      return { ok: false, status: 500, message: String(err) };
    }
  }

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

    // console.log('authHeader === ',authHeader);
    // console.log('templatePayload === ',templatePayload);
    // console.log('data === ',data);

    // Recursively parse Date objects into plain string ISO formats for Handlebars compatibility
    const cleanData = JSON.parse(JSON.stringify(data));

    const requestPayload = {
      template: templatePayload,
      data: cleanData,
      options: {
        // Asks JSReport engine to include internal evaluation trace details
        reports: { save: true },
      },
    };

    console.log("\n================ [JSREPORT REQUEST DIAGNOSTICS] ================");
    console.log("1. Endpoint URL  :", jsreportUrl);
    console.log("2. Auth Header   :", authHeader.substring(0, 15) + "...");
    console.log("3. Target ID/Name:", templatePayload);
    console.log("4. Payload Keys  :", Object.keys(cleanData));
    console.log("=================================================================\n");



    const response = await fetch(jsreportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },

      body: JSON.stringify(requestPayload),
      // body: JSON.stringify({
      //   template: templatePayload,
      //   data: cleanData
      //   // data: {
      //   //   response: data, // Wrap payload in `response` key to match JSReport legacy conventions
      //   // },
      // }),
    });

     console.log("================ [JSREPORT RESPONSE DIAGNOSTICS] ================");
    console.log("Response Status :", response.status, response.statusText);
    console.log("Content-Type    :", response.headers.get("content-type"));
    console.log("Content-Length  :", response.headers.get("content-length"));
    console.log("Profile Location:", response.headers.get("profile-location"));
    console.log("Credits Spent   :", response.headers.get("jo-credits-spent"));
    console.log("=================================================================\n");


    if (!response.ok) {
      const errorText = await response.text();
      console.error("[JSREPORT_ERROR]:", errorText);
      throw new Error(
        `jsreport rendering failed with status ${response.status}: ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[JSREPORT_SUCCESS]: Generated PDF Buffer size = ${buffer.length} bytes.`);

    if (buffer.length === 0) {
      console.error(
        "[JSREPORT_EMPTY_PDF]: Server returned 200 OK, but output byte length is 0. " +
        "Check JSReport Studio template recipe (e.g. chrome-pdf vs html-to-xlsx) or script errors."
      );
    }

    return buffer;
  }
}
