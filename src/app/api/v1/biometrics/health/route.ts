import { NextResponse } from "next/server";
import { BiometricApiService } from "@/services/biometric-api.service";

export async function GET() {
  try {
    const health = await BiometricApiService.checkHealth();
    return NextResponse.json(health);
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unreachable",
        error: err.message,
        databaseConnected: false,
        pgvectorAvailable: false,
      },
      { status: 503 }
    );
  }
}
