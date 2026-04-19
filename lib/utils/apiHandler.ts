// lib/utils/apiHandler.ts

import { NextResponse } from "next/server";

type ApiHandler = () => Promise<Response>;

export async function apiHandler(fn: ApiHandler): Promise<Response> {
  try {
    return await fn();
  } catch (error: unknown) {
    console.error(error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unexpected error" },
      { status: 500 }
    );
  }
}