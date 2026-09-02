// app/api/uploadthing/route.ts

import { createRouteHandler } from "uploadthing/next";
import { OurFileRouter } from "./core";

console.log(
  "UploadThing token configured:",
  Boolean(process.env.UPLOADTHING_TOKEN),
);
console.log(
  "UploadThing token length:",
  process.env.UPLOADTHING_TOKEN?.length ?? 0,
);

export const { GET, POST } = createRouteHandler({
  router: OurFileRouter,
});
