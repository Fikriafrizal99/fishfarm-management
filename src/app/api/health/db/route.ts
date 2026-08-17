import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function GET() {
  try {
    await db.$queryRawUnsafe("SELECT 1");

    const [farms, ponds, activeCycles] = await Promise.all([
      db.farm.count(),
      db.pond.count(),
      db.productionCycle.count({ where: { status: { in: ["ACTIVE", "HARVESTING"] } } }),
    ]);

    return NextResponse.json({
      status: "ok",
      database: "connected",
      data: { farms, ponds, activeCycles },
    });
  } catch (error) {
    console.error("Database health check failed", error);

    return NextResponse.json(
      { status: "error", database: "unavailable" },
      { status: 503 },
    );
  }
}
